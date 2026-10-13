import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  DiaryEntry,
  CreateDiaryEntry,
  UpdateDiaryEntry,
  DiaryFilters
} from '../shared/types/diary'
import type { SyncSettings, SyncStatus, PushResult, PullResult } from '../shared/types/sync'

interface DiaryAPI {
  create(data: CreateDiaryEntry): Promise<DiaryEntry>
  update(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null>
  delete(id: string): Promise<void>
  get(id: string): Promise<DiaryEntry | null>
  list(filters?: DiaryFilters): Promise<DiaryEntry[]>
  search(query: string): Promise<DiaryEntry[]>
  getByDate(date: string): Promise<DiaryEntry[]>
  getDates(year: number, month: number): Promise<string[]>
  uploadImage(): Promise<string | null>
  push(): Promise<PushResult>
  pull(): Promise<PullResult>
  getSyncStatus(): Promise<SyncStatus>
}

interface SettingsAPI {
  getSync(): Promise<SyncSettings>
  setSync(settings: SyncSettings): Promise<void>
}

interface WindowAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
  }
  diary: DiaryAPI
  settings: SettingsAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowAPI
  }
}
