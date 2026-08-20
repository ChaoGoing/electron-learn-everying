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
} from '../storage/diary'
import type { CreateDiaryEntry, UpdateDiaryEntry, DiaryFilters } from '../../shared/types/diary'

const CHANNELS = {
  DIARY_CREATE: 'diary:create',
  DIARY_UPDATE: 'diary:update',
  DIARY_DELETE: 'diary:delete',
  DIARY_GET: 'diary:get',
  DIARY_LIST: 'diary:list',
  DIARY_SEARCH: 'diary:search',
  DIARY_GET_BY_DATE: 'diary:getByDate',
  DIARY_GET_DATES: 'diary:getDates',
  DIARY_UPLOAD_IMAGE: 'diary:uploadImage',
}

export function registerDiaryHandlers(): void {
  ipcMain.handle(CHANNELS.DIARY_CREATE, (_event, data: CreateDiaryEntry) => {
    return createEntry(data)
  })

  ipcMain.handle(CHANNELS.DIARY_UPDATE, (_event, id: string, data: UpdateDiaryEntry) => {
    return updateEntry(id, data)
  })

  ipcMain.handle(CHANNELS.DIARY_DELETE, (_event, id: string) => {
    return deleteEntry(id)
  })

  ipcMain.handle(CHANNELS.DIARY_GET, (_event, id: string) => {
    return getEntry(id)
  })

  ipcMain.handle(CHANNELS.DIARY_LIST, (_event, filters: DiaryFilters) => {
    return listEntries(filters)
  })

  ipcMain.handle(CHANNELS.DIARY_SEARCH, (_event, query: string) => {
    return searchEntries(query)
  })

  ipcMain.handle(CHANNELS.DIARY_GET_BY_DATE, (_event, date: string) => {
    return getEntriesByDate(date)
  })

  ipcMain.handle(CHANNELS.DIARY_GET_DATES, (_event, year: number, month: number) => {
    return getDatesWithEntries(year, month)
  })

  ipcMain.handle(CHANNELS.DIARY_UPLOAD_IMAGE, () => {
    return uploadImage()
  })
}