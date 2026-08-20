import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { minimizeWindow, maximizeWindow, closeWindow, isMaximized } from '../window'

export function registerWindowHandlers(): void {
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => minimizeWindow())
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => maximizeWindow())
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => closeWindow())

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => isMaximized())
}