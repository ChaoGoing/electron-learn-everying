import { ipcMain } from 'electron'
import { push, pull, getSyncStatus } from '../sync/diary'
import { getSyncSettings, setSyncSettings } from '../storage/settings'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import type { SyncSettings } from '../../shared/types/sync'

export function registerSyncHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIARY_PUSH, () => push())
  ipcMain.handle(IPC_CHANNELS.DIARY_PULL, () => pull())
  ipcMain.handle(IPC_CHANNELS.DIARY_GET_SYNC_STATUS, () => getSyncStatus())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_SYNC, () => getSyncSettings())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_SYNC, (_event, settings: SyncSettings) =>
    setSyncSettings(settings)
  )
}
