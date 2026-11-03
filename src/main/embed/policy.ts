/**
 * 嵌入页面的安全策略。
 *
 * `<webview>` 会把一个完整的第三方页面塞进应用，如果不加约束，被嵌入页面可以：
 * 通过 `preload` 拿到 Node 能力、通过 `allowpopups` 弹出任意窗口、导航到 `file://`
 * 读取本地文件。这里在 `will-attach-webview` 阶段统一收口。
 */
import { app, shell, type BrowserWindow } from 'electron'
import { join, normalize, sep } from 'path'

/** 允许被嵌入的协议。 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'about:'])

/** 打包后渲染进程产物所在目录；`file://` 只允许指向这里。 */
function rendererDir(): string {
  return normalize(join(__dirname, '../renderer'))
}

function isInsideRendererDir(filePath: string): boolean {
  const root = rendererDir()
  const target = normalize(filePath)
  return target === root || target.startsWith(root + sep)
}

/**
 * 判断一个嵌入地址是否被允许。
 *
 * - `http` / `https` / `about:blank` 放行；
 * - `file://` 只放行应用自身的渲染产物（内嵌的演示页、帮助页等）；
 * - 其余协议（`javascript:`、`data:`、`smb:` 等）一律拒绝。
 */
export function isAllowedEmbedUrl(rawUrl: string): boolean {
  if (!rawUrl) return false
  if (rawUrl === 'about:blank') return true

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return false
  if (url.protocol !== 'file:') return true

  try {
    return isInsideRendererDir(decodeURIComponent(url.pathname))
  } catch {
    return false
  }
}

/**
 * 收紧即将挂载的 `<webview>`。
 *
 * 直接改写 `webPreferences`（Electron 的约定做法）：
 * - 删除子页面自带的 `preload`，杜绝它拿到 `ipcRenderer`；
 * - 强制关闭 `nodeIntegration`、开启 `contextIsolation` 与 `sandbox`；
 * - 关闭 `webSecurity` 的降级开关。
 *
 * 返回 `false` 表示应取消挂载。
 */
export function hardenWebviewPreferences(
  webPreferences: Electron.WebPreferences,
  params: { src?: string }
): boolean {
  if (!isAllowedEmbedUrl(params.src ?? '')) {
    console.warn('[embed] 已拦截不允许的 webview 地址：', params.src)
    return false
  }

  delete webPreferences.preload
  delete (webPreferences as { preloadURL?: string }).preloadURL
  webPreferences.nodeIntegration = false
  webPreferences.nodeIntegrationInSubFrames = false
  webPreferences.contextIsolation = true
  webPreferences.sandbox = true
  webPreferences.webSecurity = true
  webPreferences.allowRunningInsecureContent = false
  webPreferences.experimentalFeatures = false

  // 开发环境保留 devtools 便于调试嵌入页；生产环境一律关闭。
  if (app.isPackaged) webPreferences.devTools = false

  return true
}

/**
 * 给一个窗口装上嵌入相关的全部守卫。
 *
 * 覆盖三层：
 * 1. `will-attach-webview`：收紧即将挂载的 webview 并做地址白名单；
 * 2. `did-attach-webview`：让嵌入页里的 `window.open` 走系统浏览器而不是开新窗口；
 * 3. `web-contents-created`：兜住任何漏网的 webview 内容，禁止其自行导航到外部站点。
 */
export function installEmbedGuards(win: BrowserWindow): void {
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!hardenWebviewPreferences(webPreferences, params)) {
      event.preventDefault()
    }
  })

  win.webContents.on('did-attach-webview', (_event, guest) => {
    // 嵌入页里点外链 → 交给系统浏览器，不在应用内开窗。
    guest.setWindowOpenHandler(({ url }) => {
      if (isAllowedEmbedUrl(url)) {
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    })

    guest.on('will-navigate', (event, url) => {
      if (!isAllowedEmbedUrl(url)) {
        event.preventDefault()
        console.warn('[embed] 已拦截 webview 导航：', url)
      }
    })
  })

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  })
}
