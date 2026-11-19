import type { DiaryCard, DiaryEntry } from '../../../shared/types/diary'

/* ─────────────────────────────────────────────────────────────
   文本提取与字数

   搜索与字数都只关心「这张卡片/这一天写了什么」，与版式、时间、底色无关。
───────────────────────────────────────────────────────────── */

/** 一条卡片的可读文本（用于搜索与字数）。 */
export function cardText(card: DiaryCard): string {
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
 *
 * 区段：扩展 A / 基本区 / 兼容表意文字（U+F900-U+FAFF）/ 日文假名。
 * 兼容区用码位转义写，避免「豈」这类兼容字被误敲成同名汉字（U+8C48）。
 */
export function countText(text: string): number {
  const cjkPattern = /[㐀-䶿一-鿿豈-﫿぀-ヿ]/g
  const cjk = text.match(cjkPattern)
  const words = text
    .replace(cjkPattern, ' ')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
  return (cjk ? cjk.length : 0) + words.length
}

/** 一天日记的总字数 = 各卡片字数之和。 */
export function countCards(cards: DiaryCard[]): number {
  return cards.reduce((total, card) => total + countText(cardText(card)), 0)
}

/** 一条日记的检索文本（标题 + 全部卡片正文），已转小写。 */
export function entrySearchText(entry: DiaryEntry): string {
  return [entry.title, ...entry.cards.map(cardText)].join(' ').toLowerCase()
}
