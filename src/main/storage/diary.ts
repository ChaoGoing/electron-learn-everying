import { app } from 'electron'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'
import type {
  DiaryEntry,
  CreateDiaryEntry,
  UpdateDiaryEntry,
  DiaryFilters
} from '../../shared/types/diary'

type DiaryEntryMeta = Pick<
  DiaryEntry,
  'id' | 'title' | 'mood' | 'weather' | 'wordCount' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data', 'diary')
}

function getEntryPath(date: string, id: string): string {
  const [year, month] = date.split('-')
  return path.join(getDataDir(), year, month, `${date}-${id}.json`)
}

function getIndexPath(): string {
  return path.join(getDataDir(), 'index.json')
}

function entryDate(entry: DiaryEntry): string {
  return entry.createdAt.slice(0, 10)
}

function entryMeta(entry: DiaryEntry): DiaryEntryMeta {
  return {
    id: entry.id,
    title: entry.title,
    mood: entry.mood,
    weather: entry.weather,
    wordCount: entry.wordCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    deletedAt: entry.deletedAt ?? null
  }
}

// Legacy JSON files may predate the `deletedAt` field; normalize on read.
function normalizeEntry(raw: Partial<DiaryEntry> | null | undefined): DiaryEntry {
  const createdAt = raw?.createdAt ?? ''
  return {
    id: raw?.id ?? '',
    title: raw?.title ?? '',
    content: raw?.content ?? '',
    mood: raw?.mood ?? null,
    weather: raw?.weather ?? null,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    isFavorite: raw?.isFavorite ?? false,
    wordCount: typeof raw?.wordCount === 'number' ? raw.wordCount : 0,
    createdAt,
    updatedAt: raw?.updatedAt ?? createdAt,
    deletedAt: raw?.deletedAt ?? null
  }
}

// Read index: { [dateStr]: DiaryEntryMeta[] }
async function readIndex(): Promise<Record<string, DiaryEntryMeta[]>> {
  const indexPath = getIndexPath()
  if (await fs.pathExists(indexPath)) {
    return (await fs.readJSON(indexPath)) as Record<string, DiaryEntryMeta[]>
  }
  return {}
}

async function writeIndex(index: Record<string, DiaryEntryMeta[]>): Promise<void> {
  const indexPath = getIndexPath()
  await fs.ensureDir(path.dirname(indexPath))
  await fs.writeJSON(indexPath, index, { spaces: 2 })
}

// Write an entry file and upsert its index meta (used by create, update, delete, and sync-merge).
async function writeEntryFile(entry: DiaryEntry): Promise<void> {
  const date = entryDate(entry)
  const filePath = getEntryPath(date, entry.id)
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeJSON(filePath, entry, { spaces: 2 })

  const index = await readIndex()
  if (!index[date]) index[date] = []
  const meta = entryMeta(entry)
  const i = index[date].findIndex((e) => e.id === entry.id)
  if (i === -1) {
    index[date].push(meta)
  } else {
    index[date][i] = meta
  }
  await writeIndex(index)
}

// Strip HTML tags for plain text search
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

// Count words in HTML content
function countWords(html: string): number {
  const text = stripHtml(html)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export async function createEntry(data: CreateDiaryEntry = {}): Promise<DiaryEntry> {
  const now = new Date().toISOString()
  const entry: DiaryEntry = {
    id: crypto.randomUUID(),
    title: data.title || '',
    content: data.content || '',
    mood: data.mood || null,
    weather: data.weather || null,
    tags: data.tags || [],
    isFavorite: false,
    wordCount: data.content ? countWords(data.content) : 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }

  await writeEntryFile(entry)
  return entry
}

export async function updateEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null> {
  const entry = await getEntry(id)
  if (!entry) return null

  const updated: DiaryEntry = {
    ...entry,
    ...data,
    wordCount: data.content !== undefined ? countWords(data.content) : entry.wordCount,
    updatedAt: new Date().toISOString()
  }

  await writeEntryFile(updated)
  return updated
}

// Soft delete: write a tombstone instead of removing the file, so the deletion can propagate.
export async function deleteEntry(id: string): Promise<void> {
  const entry = await getEntry(id)
  if (!entry) return

  const now = new Date().toISOString()
  const updated: DiaryEntry = {
    ...entry,
    deletedAt: now,
    updatedAt: now
  }

  await writeEntryFile(updated)
}

export async function getEntry(id: string): Promise<DiaryEntry | null> {
  const index = await readIndex()
  for (const date of Object.keys(index)) {
    const found = index[date].find((e) => e.id === id)
    if (found) {
      const filePath = getEntryPath(date, id)
      if (await fs.pathExists(filePath)) {
        return normalizeEntry(await fs.readJSON(filePath))
      }
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
    if (filters.month && !date.startsWith(`-${filters.month.toString().padStart(2, '0')}`)) continue

    const dateEntries = index[date] || []
    for (const meta of dateEntries) {
      const filePath = getEntryPath(date, meta.id)
      if (await fs.pathExists(filePath)) {
        const entry = normalizeEntry(await fs.readJSON(filePath))

        // Hide tombstones from user-facing queries.
        if (entry.deletedAt) continue

        if (filters.mood && entry.mood !== filters.mood) continue
        if (filters.tag && !entry.tags.includes(filters.tag)) continue
        if (filters.search) {
          const q = filters.search.toLowerCase()
          const text = stripHtml(entry.content).toLowerCase()
          if (!entry.title.toLowerCase().includes(q) && !text.includes(q)) continue
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
      const filePath = getEntryPath(date, meta.id)
      if (!(await fs.pathExists(filePath))) continue
      const entry = normalizeEntry(await fs.readJSON(filePath))
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
  await writeEntryFile(normalizeEntry(entry))
}

export async function uploadImage(): Promise<string | null> {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const srcPath = result.filePaths[0]
  const ext = path.extname(srcPath)
  const destName = `${crypto.randomUUID()}${ext}`
  const destDir = path.join(app.getPath('userData'), 'images')
  const destPath = path.join(destDir, destName)

  await fs.ensureDir(destDir)
  await fs.copyFile(srcPath, destPath)

  // Return a file:// URL that the renderer can use
  return `file://${destPath}`
}
