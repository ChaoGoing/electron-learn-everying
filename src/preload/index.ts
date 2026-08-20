import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/types/ipc'

// Custom APIs for renderer — typed wrapper around IPC channels
const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED) as Promise<boolean>,
  },

  // Diary
  diary: {
    create: (data: unknown) => ipcRenderer.invoke('diary:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('diary:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('diary:delete', id),
    get: (id: string) => ipcRenderer.invoke('diary:get', id),
    list: (filters?: unknown) => ipcRenderer.invoke('diary:list', filters || {}),
    search: (query: string) => ipcRenderer.invoke('diary:search', query),
    getByDate: (date: string) => ipcRenderer.invoke('diary:getByDate', date),
    getDates: (year: number, month: number) => ipcRenderer.invoke('diary:getDates', year, month),
    uploadImage: () => ipcRenderer.invoke('diary:uploadImage') as Promise<string | null>,
  },
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