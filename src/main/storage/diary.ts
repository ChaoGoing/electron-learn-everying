import { app } from 'electron'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'
import type {
  DiaryEntry,
  CreateDiaryEntry,
  UpdateDiaryEntry,
  DiaryFilters,
  DiaryCard,
  DiaryCardBackground,
  DiaryCardType,
  DiaryCardWidth,
  DiaryChecklistItem,
  DiaryPageBackground,
  ImageAsset
} from '../../shared/types/diary'
import { CARD_DEFAULT_PADDING } from '../../shared/types/diary'

type DiaryEntryMeta = Pick<
  DiaryEntry,
  'id' | 'title' | 'mood' | 'weather' | 'wordCount' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data', 'diary')
}

function getImagesDir(): string {
  return path.join(app.getPath('userData'), 'images')
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

/* ─────────────────────────────────────────────────────────────
   卡片规范化
───────────────────────────────────────────────────────────── */

const CARD_TYPES: DiaryCardType[] = [
  'text',
  'photo',
  'quote',
  'checklist',
  'mood',
  'music',
  'weather',
  'location'
]

const CARD_WIDTHS: DiaryCardWidth[] = ['full', 'half', 'third']
const CARD_BACKGROUNDS: DiaryCardBackground[] = ['paper', 'cream', 'sand', 'moss', 'sky']
const PAGE_BACKGROUNDS: DiaryPageBackground[] = ['paper', 'sand', 'moss', 'sky']

const DEFAULT_WIDTH: Record<DiaryCardType, DiaryCardWidth> = {
  text: 'half',
  photo: 'half',
  quote: 'third',
  checklist: 'third',
  mood: 'third',
  music: 'third',
  weather: 'third',
  location: 'third'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function toCardType(raw: unknown): DiaryCardType | null {
  return CARD_TYPES.includes(raw as DiaryCardType) ? (raw as DiaryCardType) : null
}

function toWidth(raw: unknown, type: DiaryCardType): DiaryCardWidth {
  return CARD_WIDTHS.includes(raw as DiaryCardWidth) ? (raw as DiaryCardWidth) : DEFAULT_WIDTH[type]
}

function toBackground(raw: unknown, type: DiaryCardType): DiaryCardBackground {
  if (CARD_BACKGROUNDS.includes(raw as DiaryCardBackground)) {
    return raw as DiaryCardBackground
  }
  return type === 'quote' ? 'cream' : 'paper'
}

function toPadding(raw: unknown): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return CARD_DEFAULT_PADDING
  return Math.min(32, Math.max(8, Math.round(raw)))
}

function toTags(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter(isNonEmptyString) : []
}

function toChecklistItems(raw: unknown): DiaryChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: isNonEmptyString(item.id) ? item.id : crypto.randomUUID(),
      text: typeof item.text === 'string' ? item.text : '',
      done: item.done === true
    }))
}

/**
 * 把一条卡片原始数据补全成合法卡片。类型缺失或未知的卡片返回 null（丢弃）。
 */
function normalizeCard(raw: unknown, fallbackOrder: number): DiaryCard | null {
  if (!raw || typeof raw !== 'object') return null
  const card = raw as Record<string, unknown>
  const type = toCardType(card.type)
  if (!type) return null

  const base = {
    id: isNonEmptyString(card.id) ? card.id : crypto.randomUUID(),
    order: typeof card.order === 'number' && !Number.isNaN(card.order) ? card.order : fallbackOrder,
    width: toWidth(card.width, type),
    background: toBackground(card.background, type),
    padding: toPadding(card.padding),
    time: isNonEmptyString(card.time) ? card.time : null,
    title: typeof card.title === 'string' ? card.title : ''
  }

  switch (type) {
    case 'text':
      return {
        ...base,
        type,
        text: typeof card.text === 'string' ? card.text : '',
        mood: isNonEmptyString(card.mood) ? card.mood : null,
        tags: toTags(card.tags)
      }
    case 'photo':
      return {
        ...base,
        type,
        images: Array.isArray(card.images) ? card.images.filter(isNonEmptyString) : [],
        caption: typeof card.caption === 'string' ? card.caption : '',
        place: isNonEmptyString(card.place) ? card.place : null
      }
    case 'quote':
      return {
        ...base,
        type,
        text: typeof card.text === 'string' ? card.text : '',
        source: typeof card.source === 'string' ? card.source : ''
      }
    case 'checklist':
      return {
        ...base,
        type,
        variant: card.variant === 'pills' ? 'pills' : 'list',
        items: toChecklistItems(card.items)
      }
    case 'mood':
      return {
        ...base,
        type,
        mood: isNonEmptyString(card.mood) ? card.mood : null,
        note: typeof card.note === 'string' ? card.note : ''
      }
    case 'music':
      return {
        ...base,
        type,
        song: typeof card.song === 'string' ? card.song : '',
        artist: typeof card.artist === 'string' ? card.artist : '',
        url: isNonEmptyString(card.url) ? card.url : null,
        note: typeof card.note === 'string' ? card.note : ''
      }
    case 'weather':
      return {
        ...base,
        type,
        weather: isNonEmptyString(card.weather) ? card.weather : null,
        temperature: typeof card.temperature === 'number' ? card.temperature : null,
        place: isNonEmptyString(card.place) ? card.place : null
      }
    case 'location':
      return {
        ...base,
        type,
        place: typeof card.place === 'string' ? card.place : '',
        note: typeof card.note === 'string' ? card.note : ''
      }
  }
}

function normalizeCards(raw: unknown): DiaryCard[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((card, index) => normalizeCard(card, index))
    .filter((card): card is DiaryCard => card !== null)
    .sort((a, b) => a.order - b.order)
    .map((card, index) => ({ ...card, order: index }))
}

/* ─────────────────────────────────────────────────────────────
   旧版富文本 → 卡片迁移
───────────────────────────────────────────────────────────── */

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 去掉标签，把块级标签换成换行，保留段落结构。 */
function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/blockquote|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n')
}

function extractAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? decodeEntities(match[1]) : null
}

/**
 * 把一条旧版 Tiptap HTML 正文拆成卡片：引用块 → 摘录卡，任务列表 → 清单卡，
 * 图片 → 照片卡，其余文字 → 文字卡。
 */
function cardsFromLegacyHtml(html: string): DiaryCard[] {
  const cards: DiaryCard[] = []
  let rest = html

  const blockquotes: string[] = []
  rest = rest.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) => {
    blockquotes.push(inner)
    return ''
  })

  const checklistHtml: string[] = []
  rest = rest.replace(
    /<ul[^>]*data-type\s*=\s*"taskList"[^>]*>([\s\S]*?)<\/ul>/gi,
    (_m, inner: string) => {
      checklistHtml.push(inner)
      return ''
    }
  )

  const imageTags: string[] = []
  rest = rest.replace(/<img[^>]*>/gi, (tag: string) => {
    imageTags.push(tag)
    return ''
  })

  let order = 0
  const text = htmlToPlainText(rest)
  if (text) {
    cards.push({
      id: crypto.randomUUID(),
      type: 'text',
      order: order++,
      width: 'half',
      background: 'paper',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '',
      text,
      mood: null,
      tags: []
    })
  }

  for (const blockquote of blockquotes) {
    const plain = htmlToPlainText(blockquote)
    if (!plain) continue
    const cite = blockquote.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i)
    cards.push({
      id: crypto.randomUUID(),
      type: 'quote',
      order: order++,
      width: 'third',
      background: 'cream',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '摘录',
      text: plain,
      source: cite ? htmlToPlainText(cite[1]) : ''
    })
  }

  for (const listHtml of checklistHtml) {
    const items: DiaryChecklistItem[] = []
    const liPattern = /<li([^>]*)>([\s\S]*?)<\/li>/gi
    let li = liPattern.exec(listHtml)
    while (li) {
      const liText = htmlToPlainText(li[2])
      if (liText) {
        items.push({
          id: crypto.randomUUID(),
          text: liText,
          done: /data-checked\s*=\s*"true"/i.test(li[1])
        })
      }
      li = liPattern.exec(listHtml)
    }
    if (items.length > 0) {
      cards.push({
        id: crypto.randomUUID(),
        type: 'checklist',
        order: order++,
        width: 'third',
        background: 'paper',
        padding: CARD_DEFAULT_PADDING,
        time: null,
        title: '清单',
        variant: 'list',
        items
      })
    }
  }

  const images = imageTags
    .map((tag) => extractAttr(tag, 'src'))
    .filter((src): src is string => !!src)
  if (images.length > 0) {
    cards.push({
      id: crypto.randomUUID(),
      type: 'photo',
      order: order++,
      width: 'half',
      background: 'paper',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '照片',
      images,
      caption: '',
      place: null
    })
  }

  return cards
}

/* ─────────────────────────────────────────────────────────────
   规范化入口 / 字数
───────────────────────────────────────────────────────────── */

// Legacy JSON files may predate `cards` / `deletedAt`; normalize (and migrate) on read.
function normalizeEntry(raw: Partial<DiaryEntry> | null | undefined): DiaryEntry {
  const createdAt = raw?.createdAt ?? ''
  const cards = normalizeCards(raw?.cards)
  const legacyContent = typeof raw?.content === 'string' ? raw.content : ''
  const resolvedCards = cards.length > 0 ? cards : cardsFromLegacyHtml(legacyContent)

  return {
    id: raw?.id ?? '',
    title: raw?.title ?? '',
    content: '',
    cards: resolvedCards,
    background: PAGE_BACKGROUNDS.includes(raw?.background as DiaryPageBackground)
      ? (raw?.background as DiaryPageBackground)
      : 'paper',
    mood: raw?.mood ?? null,
    weather: raw?.weather ?? null,
    location: raw?.location ?? null,
    tags: toTags(raw?.tags),
    isFavorite: raw?.isFavorite ?? false,
    wordCount: countCards(resolvedCards),
    createdAt,
    updatedAt: raw?.updatedAt ?? createdAt,
    deletedAt: raw?.deletedAt ?? null
  }
}

/** 一条卡片的可读文本（用于搜索与字数）。 */
function cardText(card: DiaryCard): string {
  switch (card.type) {
    case 'text':
      return [card.title, card.text, ...card.tags].filter(Boolean).join(' ')
    case 'photo':
      return [card.title, card.caption, card.place].filter(Boolean).join(' ')
    case 'quote':
      return [card.title, card.text, card.source].filter(Boolean).join(' ')
    case 'checklist':
      return [card.title, ...card.items.map((item) => item.text)].filter(Boolean).join(' ')
    case 'mood':
      return [card.title, card.mood, card.note].filter(Boolean).join(' ')
    case 'music':
      return [card.title, card.song, card.artist, card.note].filter(Boolean).join(' ')
    case 'weather':
      return [card.title, card.weather, card.place].filter(Boolean).join(' ')
    case 'location':
      return [card.title, card.place, card.note].filter(Boolean).join(' ')
  }
}

/**
 * 中英混排的「字数」：CJK 逐字计数，其余按空白切词。
 * （旧实现按空白切分，中文整段会被算成 1，与界面上的「412 字」不符。）
 */
export function countText(text: string): number {
  const cjk = text.match(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g)
  const words = text
    .replace(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g, ' ')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
  return (cjk ? cjk.length : 0) + words.length
}

function countCards(cards: DiaryCard[]): number {
  return cards.reduce((total, card) => total + countText(cardText(card)), 0)
}

function entrySearchText(entry: DiaryEntry): string {
  return [entry.title, ...entry.cards.map(cardText)].join(' ').toLowerCase()
}

/* ─────────────────────────────────────────────────────────────
   索引读写
───────────────────────────────────────────────────────────── */

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

/** 从索引里移除某一天的某条记录；该天清空后整键删除。 */
async function removeFromIndex(date: string, id: string): Promise<void> {
  const index = await readIndex()
  const bucket = index[date]
  if (!bucket) return
  const remaining = bucket.filter((meta) => meta.id !== id)
  if (remaining.length > 0) {
    index[date] = remaining
  } else {
    delete index[date]
  }
  await writeIndex(index)
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

/**
 * 改写条目所在日期（「页面设置」里的日期），必要时把文件搬到新的年月目录。
 * 保留原时刻，只替换日期部分。
 */
async function moveEntryDate(entry: DiaryEntry, nextDate: string): Promise<DiaryEntry> {
  const previousDate = entryDate(entry)
  if (previousDate === nextDate) return entry

  const timePart = entry.createdAt.slice(10)
  const moved: DiaryEntry = { ...entry, createdAt: `${nextDate}${timePart}` }
  await writeEntryFile(moved)

  const oldPath = getEntryPath(previousDate, entry.id)
  if (await fs.pathExists(oldPath)) await fs.remove(oldPath)
  await removeFromIndex(previousDate, entry.id)

  return moved
}

/* ─────────────────────────────────────────────────────────────
   读写 API
───────────────────────────────────────────────────────────── */

export async function createEntry(data: CreateDiaryEntry = {}): Promise<DiaryEntry> {
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

  await writeEntryFile(entry)
  return entry
}

export async function updateEntry(id: string, data: UpdateDiaryEntry): Promise<DiaryEntry | null> {
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

  if (date) return moveEntryDate(updated, date)
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
    if (filters.month) {
      const monthPart = date.split('-')[1]
      if (monthPart !== filters.month.toString().padStart(2, '0')) continue
    }

    const dateEntries = index[date] || []
    for (const meta of dateEntries) {
      const filePath = getEntryPath(date, meta.id)
      if (await fs.pathExists(filePath)) {
        const entry = normalizeEntry(await fs.readJSON(filePath))

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

/* ─────────────────────────────────────────────────────────────
   图片素材
───────────────────────────────────────────────────────────── */

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

async function copyIntoImagesDir(srcPaths: string[]): Promise<string[]> {
  const destDir = getImagesDir()
  await fs.ensureDir(destDir)

  const urls: string[] = []
  for (const srcPath of srcPaths) {
    const ext = path.extname(srcPath)
    const destPath = path.join(destDir, `${crypto.randomUUID()}${ext}`)
    await fs.copyFile(srcPath, destPath)
    urls.push(`file://${destPath}`)
  }
  return urls
}

/** 选择一张图片并复制到 userData/images，返回 file:// 地址。 */
export async function uploadImage(): Promise<string | null> {
  const urls = await uploadImages(false)
  return urls[0] ?? null
}

/** 选择一到多张图片并复制到 userData/images，返回 file:// 地址列表。 */
export async function uploadImages(multiple = true): Promise<string[]> {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
  })

  if (result.canceled || result.filePaths.length === 0) return []
  return copyIntoImagesDir(result.filePaths)
}

/** 列出素材库里的图片（按最近修改倒序）。 */
export async function listImages(): Promise<ImageAsset[]> {
  const dir = getImagesDir()
  if (!(await fs.pathExists(dir))) return []

  const names = await fs.readdir(dir)
  const assets: ImageAsset[] = []
  for (const name of names) {
    if (!IMAGE_EXTENSIONS.includes(path.extname(name).slice(1).toLowerCase())) continue
    const stat = await fs.stat(path.join(dir, name))
    assets.push({ url: `file://${path.join(dir, name)}`, name, modifiedAt: stat.mtimeMs })
  }
  return assets.sort((a, b) => b.modifiedAt - a.modifiedAt)
}
