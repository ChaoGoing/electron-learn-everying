import { create } from 'zustand'

interface SettingsState {
  autoSave: boolean
  autoSaveInterval: number
  editorFontSize: number
  language: string
  setAutoSave: (value: boolean) => void
  setAutoSaveInterval: (ms: number) => void
  setEditorFontSize: (size: number) => void
  setLanguage: (lang: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  autoSave: true,
  autoSaveInterval: 2000,
  editorFontSize: 16,
  language: 'zh-CN',
  setAutoSave: (autoSave): void => set({ autoSave }),
  setAutoSaveInterval: (autoSaveInterval): void => set({ autoSaveInterval }),
  setEditorFontSize: (editorFontSize): void => set({ editorFontSize }),
  setLanguage: (language): void => set({ language })
}))
