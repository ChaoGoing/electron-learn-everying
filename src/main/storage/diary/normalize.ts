import type { DiaryEntry, DiaryPageBackground } from '../../../shared/types/diary'
import { normalizeCards, toTags } from './cards'
import { cardsFromLegacyHtml } from './legacy'
import { countCards } from './text'

/** 索引里存的一条日记摘要（列表 / 搜索 / 日历只读这个，不读正文文件）。 */
export type DiaryEntryMeta = Pick<
  DiaryEntry,
  'id' | 'title' | 'mood' | 'weather' | 'wordCount' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

const PAGE_BACKGROUNDS: DiaryPageBackground[] = ['paper', 'sand', 'moss', 'sky']

/** 从完整条目里取出写进索引的摘要字段。 */
export function entryMeta(entry: DiaryEntry): DiaryEntryMeta {
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

/**
 * 把一条原始条目补全成合法条目，并顺带迁移旧数据。
 *
 * 磁盘上的 JSON 可能来自旧版本：没有 `cards` 的条目会把 `content`
 * （Tiptap HTML）拆成卡片；结果在下次写入时落盘，无需单独的迁移脚本。
 */
export function normalizeEntry(raw: Partial<DiaryEntry> | null | undefined): DiaryEntry {
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
