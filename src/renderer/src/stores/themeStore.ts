/**
 * 主题状态的唯一事实源。
 *
 * 这里同时持有「明暗模式」与「调色板」——它们是同一件事（当前外观）的两个维度：
 * - `mode` 由用户选择（设置页 / 主题切换按钮），持久化在 `localStorage`；
 * - `palette` 由路由驱动（`useRoutePalette`），随导航变化。
 *
 * 任何一处变化都会：写 DOM → 落盘 → 通知主进程（nativeTheme）→ 由 `themeBridge`
 * 下发给嵌入的子页面。组件不再各自读写 `localStorage`。
 */
import { create } from 'zustand'
import type { PaletteId, ResolvedTheme, ThemeMode } from '../../../shared/types/theme'
import {
  applyPaletteToDocument,
  applyThemeToDocument,
  resolveMode,
  systemPrefersDark
} from '../lib/theme'

const STORAGE_KEY = 'theme'

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  palette: PaletteId
  setMode: (mode: ThemeMode) => void
  toggle: () => void
  setPalette: (palette: PaletteId) => void
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {
    // localStorage 不可用（隐私模式等）时静默回落到默认值。
  }
  return 'system'
}

function persistMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // 同上：持久化失败不影响本次会话的主题。
  }
}

/** 同步给主进程，让 `nativeTheme` 与界面一致（子页面的 `prefers-color-scheme` 也跟着变）。 */
function syncNativeTheme(mode: ThemeMode): void {
  void window.api?.theme?.setNativeTheme?.(mode)
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode = readStoredMode()

  return {
    mode: initialMode,
    resolved: resolveMode(initialMode),
    palette: 'default',

    setMode: (mode): void => {
      const resolved = resolveMode(mode)
      persistMode(mode)
      applyThemeToDocument(resolved)
      syncNativeTheme(mode)
      set({ mode, resolved })
    },

    toggle: (): void => {
      const next: ResolvedTheme = get().resolved === 'dark' ? 'light' : 'dark'
      get().setMode(next)
    },

    setPalette: (palette): void => {
      if (get().palette === palette) return
      applyPaletteToDocument(palette)
      set({ palette })
    }
  }
})

/**
 * 启动主题：落地初始值、接管系统偏好变化、并把模式推给主进程。
 *
 * 返回取消订阅函数，便于 HMR / 卸载时清理。应在应用挂载时调用一次。
 */
export function initTheme(): () => void {
  const { mode, resolved, palette } = useThemeStore.getState()
  applyThemeToDocument(resolved)
  applyPaletteToDocument(palette)
  syncNativeTheme(mode)

  // 系统偏好变化：仅当用户选择「跟随系统」时才需要重算。
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = (): void => {
    if (useThemeStore.getState().mode !== 'system') return
    const next = systemPrefersDark() ? 'dark' : 'light'
    if (next === useThemeStore.getState().resolved) return
    applyThemeToDocument(next)
    useThemeStore.setState({ resolved: next })
  }
  media.addEventListener('change', onSystemChange)

  // 主进程侧的系统主题变化（与上面的 matchMedia 互补，覆盖窗口未聚焦等场景）。
  const offNative = window.api?.theme?.onSystemThemeChange?.((dark) => {
    if (useThemeStore.getState().mode !== 'system') return
    const next: ResolvedTheme = dark ? 'dark' : 'light'
    if (next === useThemeStore.getState().resolved) return
    applyThemeToDocument(next)
    useThemeStore.setState({ resolved: next })
  })

  return () => {
    media.removeEventListener('change', onSystemChange)
    offNative?.()
  }
}
