/**
 * 卡片式日记的渲染层工具：心情/天气字典、卡片工厂、版式映射、字数统计、编排模板。
 *
 * 与主进程 `src/main/storage/diary.ts` 的 `countText` / 类型定义保持一致；
 * 跨进程共享的只有类型（`shared/types/diary.ts`），逻辑各进程自带一份。
 */
import {
  CARD_DEFAULT_PADDING,
  type DiaryCard,
  type DiaryCardBackground,
  type DiaryCardType,
  type DiaryCardWidth,
  type DiaryEntry
} from '../../../shared/types/diary'

/** 渲染进程没有 Node 的 crypto 模块，用 Web Crypto。 */
const randomId = (): string => globalThis.crypto.randomUUID()

/* ── 心情 / 天气字典（原先在三个文件里各抄了一份） ───────────── */

export interface MoodOption {
  value: string
  emoji: string
  label: string
  /** 1–5，用于「平均心情」与心情曲线。 */
  score: number
}

export const MOODS: MoodOption[] = [
  { value: 'happy', emoji: '😊', label: '很好', score: 5 },
  { value: 'excited', emoji: '🤩', label: '兴奋', score: 5 },
  { value: 'grateful', emoji: '🙏', label: '感恩', score: 4 },
  { value: 'neutral', emoji: '😐', label: '平静', score: 4 },
  { value: 'tired', emoji: '😴', label: '疲惫', score: 2 },
  { value: 'sad', emoji: '😢', label: '低落', score: 2 },
  { value: 'anxious', emoji: '😰', label: '焦虑', score: 2 },
  { value: 'angry', emoji: '😤', label: '烦躁', score: 1 }
]

export const MOOD_EMOJIS: Record<string, string> = Object.fromEntries(
  MOODS.map((mood) => [mood.value, mood.emoji])
)

export const MOOD_LABELS: Record<string, string> = Object.fromEntries(
  MOODS.map((mood) => [mood.value, mood.label])
)

export const MOOD_SCORES: Record<string, number> = Object.fromEntries(
  MOODS.map((mood) => [mood.value, mood.score])
)

export const WEATHER_LABELS: Record<string, string> = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '雨',
  snowy: '雪',
  windy: '风',
  stormy: '雷暴',
  foggy: '雾'
}

/** 设计稿的五个心情档位（本月心情分布用）。 */
export const MOOD_DISTRIBUTION = ['happy', 'neutral', 'grateful', 'sad', 'tired']

/* ── 版式映射 ───────────────────────────────────────────────── */

/**
 * 版式宽度 → flex 简写。
 *
 * 「栏」是相对**行宽**而言的：通栏独占整行、半栏正好一行两张、双栏一行三张。
 * 用百分比而不是固定 px，卡片板在加了左栏、窗口变窄之后依然能保持设计的密度。
 * （gap 是 16px，所以 50% 要减 8px、33.3% 要减 11px 才严丝合缝。）
 */
export const CARD_WIDTH_FLEX: Record<DiaryCardWidth, string> = {
  full: '1 1 100%',
  half: '1 1 calc(50% - 8px)',
  third: '1 1 calc(33.333% - 11px)'
}

/** 卡片的最小宽度：窄窗下宁可折行，也不要把一张卡片压成一条。 */
export const CARD_MIN_WIDTH = 'min(100%, 200px)'

export const CARD_BACKGROUND_HEX: Record<DiaryCardBackground, string> = {
  paper: '#FFFCF6',
  cream: '#F8F2E3',
  sand: '#F2EADA',
  moss: '#E9EDE4',
  sky: '#E8EAEF'
}

/** 卡片底色对应的描边（浅色底配更浅的线，摘录卡的暖底配暖线）。 */
export const CARD_BACKGROUND_BORDER: Record<DiaryCardBackground, string> = {
  paper: '#EBE1CD',
  cream: '#E7DCC3',
  sand: '#E0D5BE',
  moss: '#D8E0D0',
  sky: '#D6DAE4'
}

/* ── 字数 ───────────────────────────────────────────────────── */

/**
 * 中英混排字数：CJK 逐字计数，其余按空白切词。
 * 与 `src/main/storage/diary.ts` 的 `countText` 保持一致。
 */
export function countText(text: string): number {
  const cjk = text.match(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g)
  const words = text
    .replace(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g, ' ')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
  return (cjk ? cjk.length : 0) + words.length
}

/** 一条卡片的可读文本；与主进程 `cardText` 对齐。 */
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

export function cardWordCount(card: DiaryCard): number {
  return countText(cardText(card))
}

export function entryWordCount(entry: DiaryEntry): number {
  return entry.cards.reduce((total, card) => total + cardWordCount(card), 0)
}

/** 页面的纯文本，用于列表预览。 */
export function entryPreview(entry: DiaryEntry, maxLength = 80): string {
  const text = entry.cards
    .map((card) => cardText(card))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/** 页面标题：显式标题优先，否则取第一张有标题的卡片。 */
export function entryTitle(entry: DiaryEntry): string {
  if (entry.title.trim()) return entry.title
  const titled = entry.cards.find((card) => card.title.trim())
  return titled?.title ?? '无标题'
}

/* ── 卡片工厂 ───────────────────────────────────────────────── */

const DEFAULT_TITLES: Record<DiaryCardType, string> = {
  text: '随笔',
  photo: '照片',
  quote: '读书摘录',
  checklist: '今日待办',
  mood: '心情',
  music: '音乐',
  weather: '天气',
  location: '位置'
}

/** 卡片类型的默认标题：标题为空时（例如从旧富文本迁移来的卡片）用它兜底显示。 */
export const DEFAULT_CARD_TITLES: Record<DiaryCardType, string> = DEFAULT_TITLES

const DEFAULT_WIDTHS: Record<DiaryCardType, DiaryCardWidth> = {
  text: 'half',
  photo: 'half',
  quote: 'third',
  checklist: 'third',
  mood: 'third',
  music: 'third',
  weather: 'third',
  location: 'third'
}

/** 当前本地时刻 `HH:mm`。 */
export function nowTime(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

/** 新建一条指定类型的空卡片（素材面板拖入 / 「添加卡片」用）。 */
export function createCard(type: DiaryCardType, order: number): DiaryCard {
  const base = {
    id: randomId(),
    order,
    width: DEFAULT_WIDTHS[type],
    background: type === 'quote' ? ('cream' as const) : ('paper' as const),
    padding: CARD_DEFAULT_PADDING,
    time: nowTime(),
    title: DEFAULT_TITLES[type]
  }

  switch (type) {
    case 'text':
      return { ...base, type, text: '', mood: null, tags: [] }
    case 'photo':
      return { ...base, type, images: [], caption: '', place: null }
    case 'quote':
      return { ...base, type, text: '', source: '' }
    case 'checklist':
      return {
        ...base,
        type,
        variant: 'list',
        items: [{ id: randomId(), text: '', done: false }]
      }
    case 'mood':
      return { ...base, type, mood: 'neutral', note: '' }
    case 'music':
      return { ...base, type, song: '', artist: '', url: null, note: '' }
    case 'weather':
      return { ...base, type, weather: 'sunny', temperature: null, place: null }
    case 'location':
      return { ...base, type, place: '', note: '' }
  }
}

/* ── 编排：插入 / 重排 / 落点判定 ───────────────────────────── */

/** 按 order 归一化为 0..n-1。所有改动都过这一道，省得手工维护顺序号时漏掉一处。 */
function renumber(cards: DiaryCard[]): DiaryCard[] {
  return cards.map((card, index) => ({ ...card, order: index }))
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length, index))
}

/**
 * 在 `insertBefore` 之前插入一张卡片；`insertBefore === cards.length` 表示追加到末尾。
 */
export function insertCardAt(
  cards: DiaryCard[],
  card: DiaryCard,
  insertBefore: number
): DiaryCard[] {
  const next = [...cards]
  next.splice(clampIndex(insertBefore, next.length), 0, card)
  return renumber(next)
}

/**
 * 把 `from` 处的卡片移动到 `insertBefore` 之前。
 *
 * 「先删后插」会让下标错位：往前拖时目标位置要减一，往后拖时不用。
 * 用一个函数收口这个偏移，调用方只说"插到第几张之前"，不必自己算。
 */
export function moveCardTo(cards: DiaryCard[], from: number, insertBefore: number): DiaryCard[] {
  if (from < 0 || from >= cards.length) return cards
  const next = [...cards]
  const [moved] = next.splice(from, 1)
  const target = from < insertBefore ? insertBefore - 1 : insertBefore
  next.splice(clampIndex(target, next.length), 0, moved)
  return renumber(next)
}

/** 指针落在一张卡片的哪一侧。 */
export type DropSide = 'before' | 'after'

/**
 * 判断落点在卡片之前还是之后。
 *
 * 卡片板是按行折行的弹性布局：只比 Y 会在同一行内判错，只比 X 会在跨行时判错。
 * 这里取归一化后偏离更大的那个轴——同行左右相邻时 X 占优，跨行上下时 Y 占优。
 */
export function dropSideOf(
  event: { clientX: number; clientY: number },
  element: HTMLElement
): DropSide {
  const rect = element.getBoundingClientRect()
  const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width)
  const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height)
  const offset = Math.abs(dx) >= Math.abs(dy) ? dx : dy
  return offset >= 0 ? 'after' : 'before'
}

/** 把「落点侧」换算成 `insertCardAt` / `moveCardTo` 的下标。 */
export function insertIndexFor(index: number, side: DropSide): number {
  return side === 'before' ? index : index + 1
}

/**
 * 竖向列表（如编排模式的「页面结构」）的落点：只看纵向中点。
 * 这种行又扁又宽，套 `dropSideOf` 会被横向偏移带偏。
 */
export function dropSideOfVertical(event: { clientY: number }, element: HTMLElement): DropSide {
  const rect = element.getBoundingClientRect()
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/* ── 编排模板 ───────────────────────────────────────────────── */

export interface ComposeTemplate {
  id: string
  label: string
  hint: string
  /** 版式预览的色块：[x, y, w, h, 强调?]，坐标系 100×52。 */
  preview: Array<{ x: number; y: number; w: number; h: number; accent: boolean }>
}

export const COMPOSE_TEMPLATES: ComposeTemplate[] = [
  {
    id: 'magazine',
    label: '杂志跨页',
    hint: '大图或长文占左，其余堆在右侧',
    preview: [
      { x: 10, y: 8, w: 26, h: 36, accent: false },
      { x: 42, y: 10, w: 48, h: 7, accent: true },
      { x: 42, y: 23, w: 38, h: 7, accent: false },
      { x: 42, y: 36, w: 44, h: 7, accent: false }
    ]
  },
  {
    id: 'grid',
    label: '九宫格',
    hint: '每张卡片等宽，一行三张',
    preview: [
      { x: 8, y: 8, w: 24, h: 15, accent: false },
      { x: 38, y: 8, w: 24, h: 15, accent: true },
      { x: 68, y: 8, w: 24, h: 15, accent: false },
      { x: 8, y: 29, w: 24, h: 15, accent: true },
      { x: 38, y: 29, w: 24, h: 15, accent: false },
      { x: 68, y: 29, w: 24, h: 15, accent: false }
    ]
  },
  {
    id: 'hero',
    label: '大图优先',
    hint: '首张通栏，其余两栏平分',
    preview: [
      { x: 10, y: 8, w: 80, h: 15, accent: false },
      { x: 10, y: 29, w: 37, h: 15, accent: true },
      { x: 53, y: 29, w: 37, h: 15, accent: false }
    ]
  }
]

/**
 * 套用模板：只改排列顺序与版式宽度，不删任何一张卡片。
 * 优先把照片推到最前，其余按原顺序跟随。
 */
export function applyTemplate(cards: DiaryCard[], templateId: string): DiaryCard[] {
  const photoFirst = [...cards].sort((a, b) => {
    const rank = (card: DiaryCard): number => (card.type === 'photo' ? 0 : 1)
    return rank(a) - rank(b) || a.order - b.order
  })

  return photoFirst.map((card, index) => {
    if (templateId === 'grid') {
      return { ...card, order: index, width: 'third' as DiaryCardWidth }
    }
    if (templateId === 'hero') {
      return { ...card, order: index, width: index === 0 ? ('full' as const) : ('half' as const) }
    }
    // 杂志跨页：首张放大，其余窄栏
    const wide = index === 0 ? card.type === 'photo' || card.type === 'text' : false
    return { ...card, order: index, width: wide ? ('half' as const) : ('third' as const) }
  })
}
