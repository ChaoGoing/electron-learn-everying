import { app } from 'electron'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'
import type { DiaryEntry, CreateDiaryEntry, UpdateDiaryEntry, DiaryFilters } from '../../shared/types/diary'

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

// Read index: { [dateStr]: [{ id, title, mood, weather, wordCount, createdAt, updatedAt }] }
async function readIndex(): Promise<Record<string, Pick<DiaryEntry, 'id' | 'title' | 'mood' | 'weather' | 'wordCount' | 'createdAt' | 'updatedAt'>[]>> {
  const indexPath = getIndexPath()
  if (await fs.pathExists(indexPath)) {
    return fs.readJSON(indexPath)
  }
  return {}
}

async function writeIndex(index: Record<string, unknown>): Promise<void> {
  const indexPath = getIndexPath()
  await fs.ensureDir(path.dirname(indexPath))
  await fs.writeJSON(indexPath, index, { spaces: 2 })
}

// Strip HTML tags for plain text search
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
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
  }

  const date = entryDate(entry)
  const filePath = getEntryPath(date, entry.id)
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeJSON(filePath, entry, { spaces: 2 })

  // Update index
  const index = await readIndex()
  if (!index[date]) index[date] = []
  index[date].push({
    id: entry.id,
    title: entry.title,
    mood: entry.mood,
    weather: entry.weather,
    wordCount: entry.wordCount,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  })
  await writeIndex(index)

  return entry
}

export async function updateEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null> {
  const entry = await getEntry(id)
  if (!entry) return null

  const oldDate = entryDate(entry)

  const updated: DiaryEntry = {
    ...entry,
    ...data,
    wordCount: data.content !== undefined ? countWords(data.content) : entry.wordCount,
    updatedAt: new Date().toISOString(),
  }

  const newDate = entryDate(updated)
  const oldPath = getEntryPath(oldDate, entry.id)
  const newPath = getEntryPath(newDate, updated.id)

  // If date changed, move file
  if (oldPath !== newPath) {
    await fs.ensureDir(path.dirname(newPath))
    await fs.writeJSON(newPath, updated, { spaces: 2 })
    await fs.remove(oldPath)

    // Update index
    const index = await readIndex()
    if (index[oldDate]) {
      index[oldDate] = index[oldDate].filter((e) => e.id !== id)
      if (index[oldDate].length === 0) delete index[oldDate]
    }
    if (!index[newDate]) index[newDate] = []
    index[newDate].push({
      id: updated.id,
      title: updated.title,
      mood: updated.mood,
      weather: updated.weather,
      wordCount: updated.wordCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
    await writeIndex(index)
  } else {
    await fs.writeJSON(oldPath, updated, { spaces: 2 })

    // Update index
    const index = await readIndex()
    if (index[oldDate]) {
      const idx = index[oldDate].findIndex((e) => e.id === id)
      if (idx !== -1) {
        index[oldDate][idx] = {
          id: updated.id,
          title: updated.title,
          mood: updated.mood,
          weather: updated.weather,
          wordCount: updated.wordCount,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        }
      }
      await writeIndex(index)
    }
  }

  return updated
}

export async function deleteEntry(id: string): Promise<void> {
  const entry = await getEntry(id)
  if (!entry) return

  const date = entryDate(entry)
  const filePath = getEntryPath(date, entry.id)
  await fs.remove(filePath)

  // Update index
  const index = await readIndex()
  if (index[date]) {
    index[date] = index[date].filter((e) => e.id !== id)
    if (index[date].length === 0) delete index[date]
    await writeIndex(index)
  }
}

export async function getEntry(id: string): Promise<DiaryEntry | null> {
  // Search through index to find the entry's date
  const index = await readIndex()
  for (const date of Object.keys(index)) {
    const found = index[date].find((e) => e.id === id)
    if (found) {
      const filePath = getEntryPath(date, id)
      if (await fs.pathExists(filePath)) {
        return fs.readJSON(filePath)
      }
    }
  }
  return null
}

export async function listEntries(filters: DiaryFilters = {}): Promise<DiaryEntry[]> {
  const index = await readIndex()
  const entries: DiaryEntry[] = []

  const datesToRead = filters.date
    ? [filters.date]
    : Object.keys(index).sort().reverse()

  for (const date of datesToRead) {
    if (filters.year && !date.startsWith(`${filters.year}-`)) continue
    if (filters.month && !date.startsWith(`-${filters.month.toString().padStart(2, '0')}`)) continue

    const dateEntries = index[date] || []
    for (const meta of dateEntries) {
      const filePath = getEntryPath(date, meta.id)
      if (await fs.pathExists(filePath)) {
        const entry = await fs.readJSON(filePath)

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
  return Object.keys(index).filter((d) => d.startsWith(prefix)).sort()
}

export async function uploadImage(): Promise<string | null> {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
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