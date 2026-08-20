import { ElectronAPI } from '@electron-toolkit/preload'
import type { DiaryEntry, CreateDiaryEntry, UpdateDiaryEntry, DiaryFilters } from '../shared/types/diary'

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
}

interface WindowAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
  }
  diary: DiaryAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowAPI
  }
}