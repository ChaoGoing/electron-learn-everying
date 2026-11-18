import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types/ipc'
import type {
  CreateDiaryEntry,
  DiaryEntry,
  DiaryFilters,
  ImageAsset,
  UpdateDiaryEntry
} from '../shared/types/diary'
import type { PullResult, PushResult, SyncSettings, SyncStatus } from '../shared/types/sync'
import type { ThemeMode } from '../shared/types/theme'

// Custom APIs for renderer — typed wrapper around IPC channels。
// 这里的方法签名需与 `index.d.ts` 的 `WindowAPI` 保持一致，
// 渲染进程拿到的 `window.api` 类型即来自该声明文件。
const api = {
  // Window controls
  window: {
    minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED) as Promise<boolean>
  },

  // Diary
  diary: {
    create: (data: CreateDiaryEntry): Promise<DiaryEntry> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_CREATE, data),
    update: (id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_UPDATE, id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_DELETE, id),
    get: (id: string): Promise<DiaryEntry | null> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_GET, id),
    list: (filters?: DiaryFilters): Promise<DiaryEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_LIST, filters || {}),
    search: (query: string): Promise<DiaryEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_SEARCH, query),
    getByDate: (date: string): Promise<DiaryEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_GET_BY_DATE, date),
    getDates: (year: number, month: number): Promise<string[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_GET_DATES, year, month),
    uploadImage: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIARY_UPLOAD_IMAGE) as Promise<string | null>,
    uploadImages: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_UPLOAD_IMAGES),
    listImages: (): Promise<ImageAsset[]> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_LIST_IMAGES),
    push: (): Promise<PushResult> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_PUSH),
    pull: (): Promise<PullResult> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_PULL),
    getSyncStatus: (): Promise<SyncStatus> => ipcRenderer.invoke(IPC_CHANNELS.DIARY_GET_SYNC_STATUS)
  },

  // Settings
  settings: {
    getSync: (): Promise<SyncSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_SYNC) as Promise<SyncSettings>,
    setSync: (settings: SyncSettings): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SYNC, settings)
  },

  // Theme — 把应用内的明暗选择同步给主进程 nativeTheme，
  // 使嵌入页面里的 prefers-color-scheme 与界面一致。
  theme: {
    setNativeTheme: (mode: ThemeMode): Promise<ThemeMode> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_SET_NATIVE_THEME, mode) as Promise<ThemeMode>,
    getNativeTheme: (): Promise<{ source: ThemeMode; shouldUseDarkColors: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_NATIVE_THEME) as Promise<{
        source: ThemeMode
        shouldUseDarkColors: boolean
      }>,
    /** 订阅系统明暗变化；返回取消订阅函数。 */
    onSystemThemeChange: (callback: (shouldUseDarkColors: boolean) => void): (() => void) => {
      const listener = (_event: unknown, shouldUseDarkColors: boolean): void =>
        callback(shouldUseDarkColors)
      ipcRenderer.on(IPC_CHANNELS.THEME_SYSTEM_CHANGED, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.THEME_SYSTEM_CHANGED, listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
