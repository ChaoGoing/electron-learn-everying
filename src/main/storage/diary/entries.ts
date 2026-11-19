import crypto from 'crypto'
import type {
  CreateDiaryEntry,
  DiaryEntry,
  DiaryFilters,
  UpdateDiaryEntry
} from '../../../shared/types/diary'
import { normalizeCards } from './cards'
import { entryFileExists, readEntry, removeEntryFile, writeEntryFile } from './entryFile'
import { readIndex, removeIndexMeta, upsertIndexMeta } from './entryIndex'
import { serializeWrite } from './io'
import { normalizeEntry } from './normalize'
import { entryDate } from './paths'
import { countCards, entrySearchText } from './text'

/* ─────────────────────────────────────────────────────────────
   写入口（索引 + 文件一起改）

   所有写操作都必须在 `serializeWrite` 里跑，见 io.ts。
───────────────────────────────────────────────────────────── */

/** 落盘一条日记并同步索引（create / update / delete / 同步合并都走这里）。 */
async function saveEntry(entry: DiaryEntry): Promise<void> {
  await writeEntryFile(entry)
  await upsertIndexMeta(entry)
}

/**
 * 改写条目所在日期（「页面设置」里的日期），必要时把文件搬到新的年月目录。
 * 保留原时刻，只替换日期部分。
 */
async function moveEntryDate(entry: DiaryEntry, nextDate: string): Promise<DiaryEntry> {
  const previousDate = entryDate(entry)
  if (previousDate === nextDate) return entry

  const timePart = entry.createdAt.slice(10)
  const moved: DiaryEntry = { ...entry, createdAt: `${nextDate}${timePart}` }
  await saveEntry(moved)

  await removeEntryFile(previousDate, entry.id)
  await removeIndexMeta(previousDate, entry.id)

  return moved
}

/* ─────────────────────────────────────────────────────────────
   对外读写 API
───────────────────────────────────────────────────────────── */

export async function createEntry(data: CreateDiaryEntry = {}): Promise<DiaryEntry> {
  return await serializeWrite(async (): Promise<DiaryEntry> => {
    const now = new Date().toISOString()
    const cards = normalizeCards(data.cards)
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      title: data.title || '',
      content: '',
      cards,
      background: data.background ?? 'paper',
      mood: data.mood || null,
      weather: data.weather || null,
      location: data.location ?? null,
      tags: data.tags || [],
      isFavorite: false,
      wordCount: countCards(cards),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }

    await saveEntry(entry)
    return entry
  })
}

export async function updateEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null> {
  return await serializeWrite(async (): Promise<DiaryEntry | null> => {
    const entry = await getEntry(id)
    if (!entry) return null

    const { date, ...patch } = data
    const cards = patch.cards !== undefined ? normalizeCards(patch.cards) : entry.cards
    const updated: DiaryEntry = {
      ...entry,
      ...patch,
      content: '',
      cards,
      wordCount: patch.cards !== undefined ? countCards(cards) : entry.wordCount,
      updatedAt: new Date().toISOString()
    }

    if (date) return await moveEntryDate(updated, date)
    await saveEntry(updated)
    return updated
  })
}

// Soft delete: write a tombstone instead of removing the file, so the deletion can propagate.
export async function deleteEntry(id: string): Promise<void> {
  await serializeWrite(async (): Promise<void> => {
    const entry = await getEntry(id)
    if (!entry) return

    const now = new Date().toISOString()
    const updated: DiaryEntry = {
      ...entry,
      deletedAt: now,
      updatedAt: now
    }

    await saveEntry(updated)
  })
}

/** 按 id 找一条日记；索引指向的文件不在磁盘上时返回 null。 */
export async function getEntry(id: string): Promise<DiaryEntry | null> {
  const index = await readIndex()
  for (const date of Object.keys(index)) {
    const found = index[date].find((e) => e.id === id)
    if (found) {
      const entry = await readEntry(date, id)
      if (entry) return entry
    }
  }
  return null
}

export async function listEntries(filters: DiaryFilters = {}): Promise<DiaryEntry[]> {
  const index = await readIndex()
  const entries: DiaryEntry[] = []

  const datesToRead = filters.date ? [filters.date] : Object.keys(index).sort().reverse()

  for (const date of datesToRead) {
    if (filters.year && !date.startsWith(`${filters.year}-`)) continue
    if (filters.month) {
      const monthPart = date.split('-')[1]
      if (monthPart !== filters.month.toString().padStart(2, '0')) continue
    }

    const dateEntries = index[date] || []
    for (const meta of dateEntries) {
      if (await entryFileExists(date, meta.id)) {
        const entry = await readEntry(date, meta.id)
        if (!entry) continue

        // Hide tombstones from user-facing queries.
        if (entry.deletedAt) continue

        if (filters.mood && entry.mood !== filters.mood) continue
        if (filters.tag && !entry.tags.includes(filters.tag)) continue
        if (filters.search && !entrySearchText(entry).includes(filters.search.toLowerCase())) {
          continue
        }

        entries.push(entry)
      }
    }
  }

  // Sort by date descending
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (filters.offset) {
    return entries.slice(filters.offset, filters.offset + (filters.limit || 20))
  }
  if (filters.limit) {
    return entries.slice(0, filters.limit)
  }
  return entries
}

export async function searchEntries(query: string): Promise<DiaryEntry[]> {
  return listEntries({ search: query })
}

export async function getEntriesByDate(date: string): Promise<DiaryEntry[]> {
  return listEntries({ date })
}

export async function getDatesWithEntries(year: number, month: number): Promise<string[]> {
  const prefix = `${year}-${month.toString().padStart(2, '0')}`
  const index = await readIndex()
  return Object.keys(index)
    .filter((d) => d.startsWith(prefix) && index[d].some((e) => !e.deletedAt))
    .sort()
}

// Return every entry (including tombstones) whose `updatedAt` is after `since`.
// An empty `since` returns everything, for first-time full sync.
export async function listEntriesForSync(since: string): Promise<DiaryEntry[]> {
  const index = await readIndex()
  const entries: DiaryEntry[] = []

  for (const date of Object.keys(index)) {
    for (const meta of index[date] || []) {
      if (!(await entryFileExists(date, meta.id))) continue
      const entry = await readEntry(date, meta.id)
      if (!entry) continue
      if (!since || entry.updatedAt > since) {
        entries.push(entry)
      }
    }
  }

  entries.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  return entries
}

// Upsert a full entry received from the remote during a pull merge.
export async function upsertSyncedEntry(entry: DiaryEntry): Promise<void> {
  await serializeWrite(async (): Promise<void> => {
    await saveEntry(normalizeEntry(entry))
  })
}
