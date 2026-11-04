/**
 * 应用根目录 URL —— 引用 `public/` 下静态页面（如嵌入演示页）时使用。
 *
 * **为什么不能直接写相对路径**：渲染进程用的是 BrowserRouter（history 路由），
 * `./embed-demo.html` 会按**当前路由**解析——在 `/lab/embed` 下变成 `/lab/embed-demo.html`。
 * 开发态这个地址会被 Vite 的 SPA 回退当成入口 HTML 返回（子页面里套了宿主自己，
 * 于是报 `TitleBar.tsx: Cannot read properties of undefined` 并显示空白），打包态直接 404。
 *
 * **为什么不能靠「启动时抓一次 location」**：开发态在 `/lab/embed` 上刷新页面时，
 * 入口 HTML 同样由 SPA 回退伺服，`location.href` 已经不是入口，抓到的目录是错的。
 * 所以改用 Vite 的 `import.meta.env.BASE_URL`（开发态 `/`、打包态 `./`）定位根目录：
 * - 绝对路径（`/`）→ 相对 origin 解析，与当前路由无关；
 * - 相对路径（`./`）→ 相对入口 HTML 解析（`file://…/renderer/index.html`）。
 */
function resolveAppBase(): string {
  const base = import.meta.env.BASE_URL
  const { origin, href } = window.location
  if (base.startsWith('/') && origin && origin !== 'null') {
    return new URL(base, origin).href
  }
  return new URL(base, href).href
}

/** 应用根目录（以 `/` 结尾）的绝对地址。 */
export const APP_BASE_URL: string = resolveAppBase()

/** 把 `public/` 下的资源路径（如 `embed-demo.html`）解析成绝对 URL。 */
export function resolvePublicAsset(path: string): string {
  return new URL(path.replace(/^\/+/, ''), APP_BASE_URL).href
}
