import { ipcMain } from 'electron'
import {
  createEntry,
  updateEntry,
  deleteEntry,
  getEntry,
  listEntries,
  searchEntries,
  getEntriesByDate,
  getDatesWithEntries,
  uploadImage,
  uploadImages,
  listImages
} from '../storage/diary'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import type { CreateDiaryEntry, UpdateDiaryEntry, DiaryFilters } from '../../shared/types/diary'

export function registerDiaryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIARY_CREATE, (_event, data: CreateDiaryEntry) => {
    return createEntry(data)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_UPDATE, (_event, id: string, data: UpdateDiaryEntry) => {
    return updateEntry(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_DELETE, (_event, id: string) => {
    return deleteEntry(id)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_GET, (_event, id: string) => {
    return getEntry(id)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_LIST, (_event, filters: DiaryFilters) => {
    return listEntries(filters)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_SEARCH, (_event, query: string) => {
    return searchEntries(query)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_GET_BY_DATE, (_event, date: string) => {
    return getEntriesByDate(date)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_GET_DATES, (_event, year: number, month: number) => {
    return getDatesWithEntries(year, month)
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_UPLOAD_IMAGE, () => {
    return uploadImage()
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_UPLOAD_IMAGES, () => {
    return uploadImages()
  })

  ipcMain.handle(IPC_CHANNELS.DIARY_LIST_IMAGES, () => {
    return listImages()
  })
}
