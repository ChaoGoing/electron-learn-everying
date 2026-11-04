/**
 * 主题核心：把「模式解析 → DOM 落地 → token 采集」这三件与框架无关的事收在一处。
 *
 * `themeStore`（状态）与 `themeBridge`（下发）都只调用这里的函数，
 * 保证宿主内部与下发给子页面的主题永远是同一份计算结果。
 */
import type { PaletteId, ResolvedTheme, ThemeMode } from '../../../shared/types/theme'

/** 会被同步给子页面的 token 前缀；其余（如 Tailwind 的 `--tw-*`）一律忽略。 */
export const SYNCED_TOKEN_PREFIXES = [
  '--color-',
  '--radius-',
  '--shadow-',
  '--font-',
  '--spacing-'
] as const

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** 查询操作系统当前是否偏好深色。 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(DARK_QUERY).matches
}

/** 把用户选择的模式解析为实际明暗；`system` 时读取系统偏好。 */
export function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

/**
 * 把明暗写到文档根节点上，共三处：
 * - `.dark` / `.light` 类：Tailwind 的 `dark:` 变体靠它生效；
 * - `data-theme` 属性：给子页面和自定义 CSS 一个稳定的选择器；
 * - `color-scheme`：让原生控件、滚动条、表单跟随明暗。
 */
export function applyThemeToDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

/**
 * 把调色板写到 `<html data-palette>`。
 * `default` 表示不设属性，回落到 `@theme` 里的基础 token。
 */
export function applyPaletteToDocument(palette: PaletteId): void {
  const root = document.documentElement
  if (palette === 'default') {
    root.removeAttribute('data-palette')
  } else {
    root.setAttribute('data-palette', palette)
  }
}

/**
 * 枚举根节点上生效的自定义属性名。
 *
 * 注意不能用 `getComputedStyle().item(i)` 遍历：Chromium 的 computed style 声明里
 * **不含**自定义属性（实测枚举出 0 条 `--*`），只有 CSS Typed OM 的
 * `computedStyleMap()` 会把它们列出来。名字拿到后仍用 `getComputedStyle` 取值，
 * 保证拿到的是层叠（含调色板覆盖）之后的结果。
 */
function customPropertyNames(root: HTMLElement): string[] {
  const names: string[] = []

  if (typeof root.computedStyleMap === 'function') {
    root.computedStyleMap().forEach((_value, name) => {
      if (name.startsWith('--')) names.push(name)
    })
    if (names.length) return names
  }

  // 兜底：不支持 CSS Typed OM 的引擎退回到遍历声明。
  const computed = window.getComputedStyle(root)
  for (let i = 0; i < computed.length; i += 1) {
    const prop = computed.item(i)
    if (prop.startsWith('--')) names.push(prop)
  }
  return names
}

/**
 * 采集根节点上所有已生效的语义 token（含当前调色板的覆盖值）。
 *
 * 值走 `getComputedStyle` 而不是解析 CSS 文本，好处是浏览器已经替我们算好了
 * 层叠与调色板覆盖，新增 token 无需改这里。
 */
export function collectThemeTokens(
  root: HTMLElement = document.documentElement
): Record<string, string> {
  const tokens: Record<string, string> = {}
  const computed = window.getComputedStyle(root)

  for (const name of customPropertyNames(root)) {
    if (!SYNCED_TOKEN_PREFIXES.some((prefix) => name.startsWith(prefix))) continue
    const value = computed.getPropertyValue(name).trim()
    if (value) tokens[name] = value
  }

  return tokens
}
