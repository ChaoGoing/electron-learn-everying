import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'system'
}

function applyTheme(resolved: 'light' | 'dark'): void {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitialTheme()
  return {
    mode: initial,
    resolved: resolveMode(initial),
    setMode: (mode) => {
      localStorage.setItem('theme', mode)
      const resolved = resolveMode(mode)
      applyTheme(resolved)
      set({ mode, resolved })
    },
    toggle: () => {
      set((state) => {
        const resolved = state.resolved === 'dark' ? 'light' : 'dark'
        const mode: ThemeMode = resolved
        localStorage.setItem('theme', mode)
        applyTheme(resolved)
        return { mode, resolved }
      })
    },
  }
})