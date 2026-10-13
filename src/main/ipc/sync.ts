import { ipcMain } from 'electron'
import { push, pull, getSyncStatus } from '../sync/diary'
import { getSyncSettings, setSyncSettings } from '../storage/settings'
import type { SyncSettings } from '../../shared/types/sync'

const CHANNELS = {
  DIARY_PUSH: 'diary:push',
  DIARY_PULL: 'diary:pull',
  DIARY_GET_SYNC_STATUS: 'diary:getSyncStatus',
  SETTINGS_GET_SYNC: 'settings:getSync',
  SETTINGS_SET_SYNC: 'settings:setSync'
}

export function registerSyncHandlers(): void {
  ipcMain.handle(CHANNELS.DIARY_PUSH, () => push())
  ipcMain.handle(CHANNELS.DIARY_PULL, () => pull())
  ipcMain.handle(CHANNELS.DIARY_GET_SYNC_STATUS, () => getSyncStatus())
  ipcMain.handle(CHANNELS.SETTINGS_GET_SYNC, () => getSyncSettings())
  ipcMain.handle(CHANNELS.SETTINGS_SET_SYNC, (_event, settings: SyncSettings) =>
    setSyncSettings(settings)
  )
}
