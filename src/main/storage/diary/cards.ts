import crypto from 'crypto'
import type {
  DiaryCard,
  DiaryCardBackground,
  DiaryCardType,
  DiaryCardWidth,
  DiaryChecklistItem
} from '../../../shared/types/diary'
import { CARD_DEFAULT_PADDING } from '../../../shared/types/diary'

/* ─────────────────────────────────────────────────────────────
   卡片规范化

   磁盘上的 JSON 可能来自旧版本、手工编辑或同步远端，字段缺失/越界都要补成
   合法值；类型缺失或未知的卡片直接丢弃（返回 null）。
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

/** 标签数组的容错：非字符串与空串一律剔除。 */
export function toTags(raw: unknown): string[] {
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

/** 规范化整组卡片：丢弃非法项，按 order 排序，再把 order 重排成连续下标。 */
export function normalizeCards(raw: unknown): DiaryCard[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((card, index) => normalizeCard(card, index))
    .filter((card): card is DiaryCard => card !== null)
    .sort((a, b) => a.order - b.order)
    .map((card, index) => ({ ...card, order: index }))
}
