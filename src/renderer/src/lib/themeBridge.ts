/**
 * themeBridge —— 宿主侧的「主题下发总线」。
 *
 * 职责：把 `themeStore` 的当前外观编译成一份 `ThemePayload`，并投递给所有已注册的
 * 嵌入目标（iframe / webview）。组件只需 `attachThemeTarget()` 注册元素，不必关心
 * 目标类型、跨源与否、加载时序。
 *
 * 三种投递路径（自动降级）：
 * | 目标                | 首帧无闪烁         | 完整 token 下发      |
 * |---------------------|--------------------|----------------------|
 * | webview             | URL 查询参数       | executeJavaScript    |
 * | iframe（同源）      | URL 查询参数       | 注入客户端 + postMessage |
 * | iframe（跨源）      | URL 查询参数       | postMessage（子页面需自带客户端） |
 */
import type { PaletteId, ThemeMessage, ThemePayload } from '../../../shared/types/theme'
import {
  THEME_BRIDGE_SOURCE,
  THEME_MESSAGE_TYPES,
  THEME_PROTOCOL_VERSION
} from '../../../shared/types/theme'
import { collectThemeTokens } from './theme'
import { useThemeStore } from '../stores/themeStore'
import themeClientSource from '../embedded/theme-client.js?raw'

export type EmbedKind = 'iframe' | 'webview'

export interface ThemeTarget {
  kind: EmbedKind
  el: HTMLElement
  /** iframe 的 postMessage 目标源；跨源必填，同源可用 `'*'`。 */
  targetOrigin: string
  /** 是否由宿主注入客户端脚本（webview 与同源 iframe 可以，跨源 iframe 不行）。 */
  injectClient: boolean
  /** 已注入过客户端，避免重复注入。 */
  injected: boolean
}

const targets = new Set<ThemeTarget>()
let disposeStoreSubscription: (() => void) | null = null

/** 客户端脚本源码：注入 webview / 同源 iframe 时使用。 */
export function getThemeClientSource(): string {
  return themeClientSource
}

/**
 * 生成当前主题快照。
 *
 * 每次调用都重新采集 token（而非缓存），因为调色板切换会改变计算值。
 */
export function buildThemePayload(): ThemePayload {
  const { mode, resolved, palette } = useThemeStore.getState()
  return {
    version: THEME_PROTOCOL_VERSION,
    mode,
    resolved,
    palette,
    tokens: collectThemeTokens(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * 把主题写进 URL 查询参数。
 *
 * 子页面在解析 HTML 时就能拿到明暗与调色板，无需等宿主消息，因此首帧不会闪白/闪黑。
 * 完整的 token 表体积较大且随调色板变化，仍走消息下发。
 */
export function withThemeQuery(
  src: string,
  theme: Pick<ThemePayload, 'resolved' | 'palette'> = useThemeStore.getState()
): string {
  try {
    const url = new URL(src, window.location.href)
    url.searchParams.set('theme', theme.resolved)
    url.searchParams.set('palette', theme.palette)
    return url.toString()
  } catch {
    return src
  }
}

function isSameOrigin(el: HTMLIFrameElement): boolean {
  try {
    // 同源时读取 contentDocument 不会抛错；跨源会抛 SecurityError。
    return Boolean(el.contentDocument)
  } catch {
    return false
  }
}

/** 向同源 iframe 注入客户端脚本。 */
function injectIntoIframe(target: ThemeTarget): void {
  const frame = target.el as HTMLIFrameElement
  if (!isSameOrigin(frame)) return
  const doc = frame.contentDocument
  if (!doc || doc.getElementById('__app-theme-client__')) return

  const script = doc.createElement('script')
  script.id = '__app-theme-client__'
  script.textContent = themeClientSource
  ;(doc.head || doc.documentElement).appendChild(script)
}

/** 把一个目标刷新到给定主题快照。加载时序未就绪时静默跳过，等下一次 ready 事件。 */
async function pushToTarget(target: ThemeTarget, payload: ThemePayload): Promise<void> {
  if (target.kind === 'iframe') {
    const frame = target.el as HTMLIFrameElement
    const win = frame.contentWindow
    if (!win) return

    if (target.injectClient) injectIntoIframe(target)

    const message: ThemeMessage = {
      source: THEME_BRIDGE_SOURCE,
      type: THEME_MESSAGE_TYPES.UPDATE,
      payload
    }
    win.postMessage(message, target.targetOrigin)
    return
  }

  const webview = target.el as HTMLElement & {
    executeJavaScript: (code: string) => Promise<unknown>
  }
  try {
    if (target.injectClient && !target.injected) {
      await webview.executeJavaScript(themeClientSource)
      target.injected = true
    }
    await webview.executeJavaScript(
      `window.__APP_THEME__ && window.__APP_THEME__.apply(${JSON.stringify(payload)})`
    )
  } catch {
    // 页面尚未 dom-ready 或已销毁：重置注入标记，等 ready 事件重试。
    target.injected = false
  }
}

/** 向所有已注册目标下发当前主题。快照只采集一次，供全部目标复用。 */
export function broadcastTheme(): void {
  if (targets.size === 0) return
  const payload = buildThemePayload()
  targets.forEach((target) => {
    void pushToTarget(target, payload)
  })
}

/**
 * 注册一个嵌入目标。
 *
 * 调用方在元素 `load` / `dom-ready` 时调用返回的 `sync()` 做首次下发；
 * 之后主题变化由总线自动推送。返回的函数用于注销。
 */
export function attachThemeTarget(target: Omit<ThemeTarget, 'injected'>): {
  sync: () => void
  detach: () => void
} {
  const entry: ThemeTarget = { ...target, injected: false }
  targets.add(entry)

  return {
    sync: () => void pushToTarget(entry, buildThemePayload()),
    detach: (): void => {
      targets.delete(entry)
    }
  }
}

/** 子页面主动 `theme:request` 时的应答。 */
function onChildRequest(event: MessageEvent): void {
  const data = event.data as ThemeMessage | undefined
  if (!data || data.source !== THEME_BRIDGE_SOURCE) return
  if (data.type !== THEME_MESSAGE_TYPES.REQUEST) return

  const win = event.source as Window | null
  if (!win || typeof win.postMessage !== 'function') return

  // file:// 页面（Electron 打包后）的 origin 是字符串 "null"，此时只能用 '*'。
  const origin = event.origin && event.origin !== 'null' ? event.origin : '*'
  const message: ThemeMessage = {
    source: THEME_BRIDGE_SOURCE,
    type: THEME_MESSAGE_TYPES.UPDATE,
    payload: buildThemePayload()
  }
  win.postMessage(message, origin)
}

/**
 * 启动总线：订阅主题变化并接管子页面请求。应用挂载时调用一次。
 * 返回清理函数。
 */
export function initThemeBridge(): () => void {
  if (disposeStoreSubscription) return disposeStoreSubscription

  window.addEventListener('message', onChildRequest)

  disposeStoreSubscription = useThemeStore.subscribe((state, prev) => {
    if (state.resolved === prev.resolved && state.palette === prev.palette) return
    broadcastTheme()
  })

  const dispose = (): void => {
    window.removeEventListener('message', onChildRequest)
    disposeStoreSubscription?.()
    disposeStoreSubscription = null
  }
  return dispose
}

/** 供调试用：当前注册的嵌入目标数量。 */
export function themeTargetCount(): number {
  return targets.size
}

export type { PaletteId }
