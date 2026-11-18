/**
 * 日记领域模型：「一天 = 一个页面，页面由若干卡片组成」（页记 · 卡片式日记）。
 *
 * - 结构化的 `cards` 是唯一事实源；`content`（旧版 Tiptap 富文本 HTML）仅为
 *   向前兼容保留，读取时由 `normalizeEntry()` 迁移成文字/照片/清单卡片。
 * - 卡片的版式（`width` / `background` / `padding` / `order`）属于数据，不是视图状态，
 *   因此随条目一起落盘与同步。
 */

/** 卡片类型：设计稿「卡片属性」的 6 种 + 素材源的「天气 / 位置」。 */
export type DiaryCardType =
  | 'text'
  | 'photo'
  | 'quote'
  | 'checklist'
  | 'mood'
  | 'music'
  | 'weather'
  | 'location'

/** 版式宽度：通栏（独占整行）/ 半栏（宽栏，默认）/ 双栏（窄栏，一行可放两张）。 */
export type DiaryCardWidth = 'full' | 'half' | 'third'

/** 卡片底色：纸白 / 浅米 / 浅褐 / 灰绿 / 灰蓝。 */
export type DiaryCardBackground = 'paper' | 'cream' | 'sand' | 'moss' | 'sky'

/** 页面底色（编排模式「页面设置 · 底色」的四个选项）。 */
export type DiaryPageBackground = 'paper' | 'sand' | 'moss' | 'sky'

export const PAGE_BACKGROUND_HEX: Record<DiaryPageBackground, string> = {
  paper: '#FBF7EE',
  sand: '#F2EADA',
  moss: '#E9EDE4',
  sky: '#E8EAEF'
}

export const PAGE_BACKGROUND_LABELS: Record<DiaryPageBackground, string> = {
  paper: '米白',
  sand: '浅褐',
  moss: '灰绿',
  sky: '灰蓝'
}

export interface DiaryChecklistItem {
  id: string
  text: string
  done: boolean
}

interface DiaryCardBase {
  id: string
  type: DiaryCardType
  /** 板上的排列序号，升序渲染。 */
  order: number
  width: DiaryCardWidth
  background: DiaryCardBackground
  /** 卡片内边距，8–32 px，步进 2。 */
  padding: number
  /** 卡片时刻 `HH:mm`，null 表示不显示。 */
  time: string | null
  /** 卡片标题（如「晨间随笔」）。 */
  title: string
}

export interface DiaryTextCard extends DiaryCardBase {
  type: 'text'
  /** 纯文本正文，段落用空行分隔。 */
  text: string
  /** 卡片底部的可选心情胶囊。 */
  mood: string | null
  /** 卡片底部的可选标签。 */
  tags: string[]
}

export interface DiaryPhotoCard extends DiaryCardBase {
  type: 'photo'
  /** file:// 图片地址，可多张。 */
  images: string[]
  caption: string
  place: string | null
}

export interface DiaryQuoteCard extends DiaryCardBase {
  type: 'quote'
  text: string
  /** 出处，如「张可久《人月圆 · 山中书事》」。 */
  source: string
}

export interface DiaryChecklistCard extends DiaryCardBase {
  type: 'checklist'
  /** 呈现方式：list = 带勾选框的清单；pills = 已完成的打卡胶囊（设计稿的「晨间例行」）。 */
  variant: 'list' | 'pills'
  items: DiaryChecklistItem[]
}

export interface DiaryMoodCard extends DiaryCardBase {
  type: 'mood'
  mood: string | null
  note: string
}

export interface DiaryMusicCard extends DiaryCardBase {
  type: 'music'
  song: string
  artist: string
  /** 可选的站外链接。 */
  url: string | null
  note: string
}

export interface DiaryWeatherCard extends DiaryCardBase {
  type: 'weather'
  weather: string | null
  /** 摄氏度，null 表示只记天气不记温度。 */
  temperature: number | null
  place: string | null
}

export interface DiaryLocationCard extends DiaryCardBase {
  type: 'location'
  place: string
  note: string
}

export type DiaryCard =
  | DiaryTextCard
  | DiaryPhotoCard
  | DiaryQuoteCard
  | DiaryChecklistCard
  | DiaryMoodCard
  | DiaryMusicCard
  | DiaryWeatherCard
  | DiaryLocationCard

export interface DiaryEntry {
  id: string
  /** 兼容字段：卡片式日记不再强制标题，留空即由首张卡片推断。 */
  title: string
  /** 旧版 Tiptap 富文本 HTML。仅作迁移输入，新数据为空串。 */
  content: string
  /** 页面卡片，升序即板上顺序。 */
  cards: DiaryCard[]
  /** 页面底色（编排模式的「页面设置」）。 */
  background: DiaryPageBackground
  mood: string | null
  weather: string | null
  /** 页面所在地点，如「杭州 · 西湖区」。 */
  location: string | null
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: string
  updatedAt: string
  /** Soft-delete tombstone. Non-null means the entry has been deleted. */
  deletedAt: string | null
}

export interface CreateDiaryEntry {
  title?: string
  content?: string
  cards?: DiaryCard[]
  background?: DiaryPageBackground
  mood?: string | null
  weather?: string | null
  location?: string | null
  tags?: string[]
}

export interface UpdateDiaryEntry {
  title?: string
  content?: string
  cards?: DiaryCard[]
  background?: DiaryPageBackground
  /** 重写页面日期（YYYY-MM-DD）：保留原时刻，只换日期，必要时移动文件。 */
  date?: string
  mood?: string | null
  weather?: string | null
  location?: string | null
  tags?: string[]
  isFavorite?: boolean
  wordCount?: number
}

export interface DiaryFilters {
  date?: string // ISO date string YYYY-MM-DD
  year?: number
  month?: number
  mood?: string
  tag?: string
  search?: string
  limit?: number
  offset?: number
}

/** 素材库里的图片（`userData/images` 下的一个文件）。 */
export interface ImageAsset {
  /** file:// 地址，可直接用于 <img src>。 */
  url: string
  name: string
  /** 毫秒时间戳，用于按最近使用排序。 */
  modifiedAt: number
}

/* ── 卡片默认值 ─────────────────────────────────────────────── */

export const CARD_TYPE_LABELS: Record<DiaryCardType, string> = {
  text: '文字',
  photo: '照片',
  quote: '摘录',
  checklist: '清单',
  mood: '心情',
  music: '音乐',
  weather: '天气',
  location: '位置'
}

export const CARD_WIDTH_LABELS: Record<DiaryCardWidth, string> = {
  full: '通栏',
  half: '半栏',
  third: '双栏'
}

export const CARD_BACKGROUND_LABELS: Record<DiaryCardBackground, string> = {
  paper: '纸白',
  cream: '浅米',
  sand: '浅褐',
  moss: '灰绿',
  sky: '灰蓝'
}

/** 默认卡片内边距（px）。 */
export const CARD_DEFAULT_PADDING = 18
