/**
 * 主题契约：宿主（本应用）与所有嵌入子页面（iframe / webview）之间的唯一约定。
 *
 * 设计要点：
 * - **宿主是唯一事实源**。子页面不定义调色板，只接收宿主算好的 CSS 变量值，
 *   因此 `styles/index.css` 里新增/调整 token 会自动传播到所有子页面。
 * - **协议是纯数据**（postMessage / executeJavaScript 都能承载），不依赖 DOM 结构，
 *   因此同源、跨源、file:// 三种子页面形态走同一套消息。
 * - 常量在此集中定义；子页面侧的 `theme-client.js` 是零依赖独立产物，
 *   为保证可移植性它自带一份同样的字符串常量（见 `src/renderer/src/embedded/`）。
 */

/** 用户选择的主题模式。 */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 把 `system` 解析后得到的实际明暗。 */
export type ResolvedTheme = 'light' | 'dark'

/**
 * 调色板（换肤）标识。与 `styles/index.css` 中的
 * `:root[data-palette='<id>']` 覆盖块一一对应。
 */
export type PaletteId = 'default' | 'journal'

/** 消息来源标识，避免与子页面自身的 postMessage 混淆。 */
export const THEME_BRIDGE_SOURCE = 'electron-learn-everying'

/** 协议版本；子页面可据此做向后兼容。 */
export const THEME_PROTOCOL_VERSION = 1

/** 主题同步消息类型。 */
export const THEME_MESSAGE_TYPES = {
  /** 宿主 → 子页面：下发完整主题快照。 */
  UPDATE: 'theme:update',
  /** 子页面 → 宿主：请求当前主题（子页面加载晚于宿主首次推送时使用）。 */
  REQUEST: 'theme:request'
} as const

export type ThemeMessageType = (typeof THEME_MESSAGE_TYPES)[keyof typeof THEME_MESSAGE_TYPES]

/**
 * 下发给子页面的完整主题快照。
 *
 * `tokens` 是宿主 `document.documentElement` 上计算后的 CSS 自定义属性键值，
 * 子页面只需把它写进一条 `:root{…}` 规则即可获得与宿主完全一致的观感。
 */
export interface ThemePayload {
  version: number
  /** 用户选择的模式（可能是 `system`）。 */
  mode: ThemeMode
  /** 解析后的实际明暗，子页面直接用这个。 */
  resolved: ResolvedTheme
  /** 当前生效的调色板。 */
  palette: PaletteId
  /** 语义 token → 计算值，例如 `{ '--color-accent': '#c8735a' }`。 */
  tokens: Record<string, string>
  /** 快照生成时间（ISO 8601），便于子页面判断新旧。 */
  updatedAt: string
}

/** 宿主 → 子页面的消息信封。 */
export interface ThemeMessage {
  source: typeof THEME_BRIDGE_SOURCE
  type: ThemeMessageType
  payload?: ThemePayload
}

/** 子页面通过 URL 查询参数获得的「首帧」主题（避免注入前的一帧闪烁）。 */
export interface ThemeQuery {
  theme?: ResolvedTheme
  palette?: PaletteId
}
