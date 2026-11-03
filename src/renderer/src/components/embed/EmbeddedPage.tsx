/**
 * EmbeddedPage —— 接入外部页面的统一入口，并自动完成主题同步。
 *
 * 用法：
 * ```tsx
 * <EmbeddedPage src="https://example.com/app" kind="iframe" title="外部应用" />
 * ```
 *
 * 主题同步由 `themeBridge` 负责，组件只做三件事：
 *   1. 把当前明暗/调色板拼进 `src` 查询参数（子页面首帧即正确，无闪烁）；
 *   2. 在加载完成事件（iframe `load` / webview `dom-ready`）时触发首次下发；
 *   3. 把元素注册进总线，之后主题变化自动推送。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useThemeStore } from '../../stores/themeStore'
import { attachThemeTarget, withThemeQuery, type EmbedKind } from '../../lib/themeBridge'

export interface EmbeddedPageProps {
  /** 子页面地址；`injectQuery` 为真时会自动补上主题查询参数。 */
  src: string
  /** 嵌入方式。`webview` 需要主进程开启 `webviewTag`（已开启）。 */
  kind?: EmbedKind
  title?: string
  className?: string
  /**
   * iframe 的 postMessage 目标源。
   * 默认由 `src` 推导；跨源子页面必须与自身源一致，否则消息会被浏览器丢弃。
   */
  targetOrigin?: string
  /**
   * 是否由宿主注入 `theme-client.js`。
   * webview 与同源 iframe 可注入；跨源 iframe 无法注入，需子页面自行引入该脚本。
   */
  injectClient?: boolean
  /** 是否把 `theme` / `palette` 拼进 URL 查询参数。 */
  injectQuery?: boolean
  /** iframe 的 sandbox 属性，默认不加（保持与 webview 一致的权限）。 */
  sandbox?: string
  allow?: string
  /** webview 会话分区，便于隔离存储。 */
  partition?: string
  /** 子页面就绪回调（可拿到元素做进一步交互）。 */
  onReady?: (el: HTMLElement) => void
  /** 加载失败回调。 */
  onError?: (reason: string) => void
  /** 加载中/失败时覆盖在容器上的内容。 */
  overlay?: (state: 'loading' | 'ready' | 'error', reload: () => void) => ReactNode
}

function resolveTargetOrigin(src: string, explicit?: string): string {
  if (explicit) return explicit
  try {
    const url = new URL(src, window.location.href)
    // file:// 页面的 origin 是字符串 "null"，postMessage 不接受它。
    if (url.protocol === 'file:') return '*'
    return url.origin
  } catch {
    return '*'
  }
}

export function EmbeddedPage({
  src,
  kind = 'iframe',
  title,
  className,
  targetOrigin,
  injectClient = true,
  injectQuery = true,
  sandbox,
  allow,
  partition,
  onReady,
  onError,
  overlay
}: EmbeddedPageProps): JSX.Element {
  // 订阅这两个字段，任何变化都会让 URL 查询参数与下发内容同步刷新。
  const resolved = useThemeStore((s) => s.resolved)
  const palette = useThemeStore((s) => s.palette)

  const hostRef = useRef<HTMLDivElement | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const controlRef = useRef<{ sync: () => void; detach: () => void } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const effectiveSrc = useMemo(
    () => (injectQuery ? withThemeQuery(src, { resolved, palette }) : src),
    [src, injectQuery, resolved, palette]
  )

  const effectiveOrigin = useMemo(
    () => resolveTargetOrigin(effectiveSrc, targetOrigin),
    [effectiveSrc, targetOrigin]
  )

  const reload = useCallback(() => {
    const el = elementRef.current
    if (!el) return
    if (kind === 'webview') {
      ;(el as HTMLElement & { reload: () => void }).reload()
    } else {
      ;(el as HTMLIFrameElement).contentWindow?.location.reload()
    }
  }, [kind])

  // 注册/注销总线目标。元素在 kind 变化时会被替换，故一并重建。
  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const control = attachThemeTarget({
      kind,
      el,
      targetOrigin: effectiveOrigin,
      injectClient
    })
    controlRef.current = control

    return (): void => {
      control.detach()
      controlRef.current = null
    }
  }, [kind, effectiveOrigin, injectClient])

  // 加载完成 → 首次下发；webview 还需监听失败事件（iframe 的 onError 覆盖不到 4xx/5xx）。
  useEffect(() => {
    const el = elementRef.current
    if (!el || kind !== 'webview') return

    const handleReady = (): void => {
      setStatus('ready')
      controlRef.current?.sync()
      onReady?.(el)
    }
    const handleFail = (event: Event): void => {
      const detail = event as Event & { errorDescription?: string; validatedURL?: string }
      setStatus('error')
      setErrorMessage(detail.errorDescription || '页面加载失败')
      onError?.(detail.errorDescription || '页面加载失败')
    }

    el.addEventListener('dom-ready', handleReady)
    el.addEventListener('did-fail-load', handleFail)
    return (): void => {
      el.removeEventListener('dom-ready', handleReady)
      el.removeEventListener('did-fail-load', handleFail)
    }
  }, [kind, effectiveSrc, onReady, onError])

  const handleIframeLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      const el = event.currentTarget
      setStatus('ready')
      controlRef.current?.sync()
      onReady?.(el)
    },
    [onReady]
  )

  return (
    <div ref={hostRef} className={cn('relative h-full w-full overflow-hidden', className)}>
      {kind === 'webview' ? (
        <webview
          ref={(node: HTMLElement | null): void => {
            elementRef.current = node
          }}
          src={effectiveSrc}
          title={title}
          // webview 特有属性，React 的类型表里没有；功能上等同 HTML 属性。
          // eslint-disable-next-line react/no-unknown-property
          partition={partition}
          className="h-full w-full border-0"
          style={{ display: 'flex' }}
        />
      ) : (
        <iframe
          ref={(node): void => {
            elementRef.current = node
          }}
          src={effectiveSrc}
          title={title}
          sandbox={sandbox}
          allow={allow}
          onLoad={handleIframeLoad}
          onError={() => {
            setStatus('error')
            setErrorMessage('页面加载失败')
            onError?.('页面加载失败')
          }}
          className="h-full w-full border-0"
        />
      )}

      {status !== 'ready' &&
        (overlay ? (
          overlay(status, reload)
        ) : (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2',
              'bg-mica-light/80 dark:bg-mica-dark/80 text-text-secondary-light dark:text-text-secondary-dark'
            )}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm">正在加载…</span>
              </>
            ) : (
              <>
                <AlertTriangle size={20} />
                <span className="text-sm">{errorMessage || '页面加载失败'}</span>
                <button
                  type="button"
                  onClick={reload}
                  className="pointer-events-auto mt-1 text-sm text-accent underline"
                >
                  重试
                </button>
              </>
            )}
          </div>
        ))}
    </div>
  )
}
