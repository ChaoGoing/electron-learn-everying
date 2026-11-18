/**
 * 日记统计：把条目列表折算成卡片板 / 回顾页需要的各种口径。
 *
 * 全部是纯函数，输入「条目数组 + 时间范围」，输出可直接渲染的结构，
 * 因此两个页面共用同一套口径，不会出现"板上的数字和回顾页对不上"。
 */
import { MOOD_SCORES } from './diaryCards'
import type { DiaryEntry } from '../../../shared/types/diary'

/* ── 日期工具（本地时区，不使用 UTC，避免跨时区错位一天） ───── */

/** Date → `YYYY-MM-DD`。 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `YYYY-MM-DD` → Date（本地零点）。 */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** 条目的日期键。 */
export function entryDateKey(entry: DiaryEntry): string {
  return entry.createdAt.slice(0, 10)
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 周一为一周首日时的中文星期名。 */
export function weekdayLabel(key: string): string {
  return `周${WEEKDAY_LABELS[fromDateKey(key).getDay()]}`
}

export function monthLabel(year: number, month: number): string {
  return `${year} · ${month}月`
}

/* ── 按天聚合 ───────────────────────────────────────────────── */

export interface DayStat {
  date: string
  /** 当天的卡片数与字数（同一天有多条时累加）。 */
  cardCount: number
  wordCount: number
  /** 当天最后一条的心情。 */
  mood: string | null
  moodScore: number | null
  entryCount: number
}

/** 同一天可能存了多条：卡片板把最近的一条当作「这一页」。 */
export function pageForDate(entries: DiaryEntry[], date: string): DiaryEntry | null {
  const sameDay = entries.filter((entry) => entryDateKey(entry) === date)
  if (sameDay.length === 0) return null
  return sameDay.reduce((latest, entry) => (entry.createdAt > latest.createdAt ? entry : latest))
}

export function monthEntries(entries: DiaryEntry[], year: number, month: number): DiaryEntry[] {
  const prefix = `${year}-${(month + 1).toString().padStart(2, '0')}`
  return entries.filter((entry) => entryDateKey(entry).startsWith(prefix))
}

export function buildDayStats(entries: DiaryEntry[]): Map<string, DayStat> {
  const stats = new Map<string, DayStat>()

  for (const entry of entries) {
    const date = entryDateKey(entry)
    const current = stats.get(date) ?? {
      date,
      cardCount: 0,
      wordCount: 0,
      mood: null,
      moodScore: null,
      entryCount: 0
    }

    current.cardCount += entry.cards.length
    current.wordCount += entry.wordCount
    current.entryCount += 1
    if (entry.mood) {
      current.mood = entry.mood
      current.moodScore = MOOD_SCORES[entry.mood] ?? null
    }
    stats.set(date, current)
  }

  return stats
}

export function sortedDateKeys(entries: DiaryEntry[]): string[] {
  return [...new Set(entries.map(entryDateKey))].sort()
}

/* ── 连续记录 ───────────────────────────────────────────────── */

export interface StreakStat {
  /** 到今天为止还连着的天数（今天没写则从昨天往前数）。 */
  current: number
  /** 全量数据里最长的一段。 */
  longest: number
  /** 本月已记录天数 / 本月天数。 */
  monthDays: number
  monthTotal: number
  /** 本月最长连续段。 */
  monthBest: number
  /** 本月是否一次没断（从 1 号起连续）。 */
  monthUnbroken: boolean
}

function longestRun(sortedKeys: string[]): number {
  let best = 0
  let run = 0
  let previous: number | null = null

  for (const key of sortedKeys) {
    const time = fromDateKey(key).getTime()
    run = previous !== null && time - previous === 86_400_000 ? run + 1 : 1
    best = Math.max(best, run)
    previous = time
  }
  return best
}

export function computeStreak(entries: DiaryEntry[], year: number, month: number): StreakStat {
  const keys = sortedDateKeys(entries)
  const keySet = new Set(keys)

  let current = 0
  const cursor = new Date()
  // 今天还没写不算断，从今天或昨天开始往前数。
  if (!keySet.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (keySet.has(toDateKey(cursor))) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const monthKeys = keys.filter((key) =>
    key.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)
  )
  const monthTotal = new Date(year, month + 1, 0).getDate()

  let monthUnbroken = monthKeys.length > 0
  for (let day = 1; day <= monthKeys.length; day += 1) {
    const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    if (!keySet.has(key)) {
      monthUnbroken = false
      break
    }
  }

  return {
    current,
    longest: longestRun(keys),
    monthDays: monthKeys.length,
    monthTotal,
    monthBest: longestRun(monthKeys),
    monthUnbroken
  }
}

/* ── 标签 / 心情 / 卡片类型 / 时段 ──────────────────────────── */

export interface TagStat {
  tag: string
  count: number
}

/**
 * 标签计数。卡片上的标签与页面级标签一起统计——设计稿的「标签」面板看的是
 * 整月出现过的标签，而不是只看页面级字段。
 */
export function tagStats(entries: DiaryEntry[]): TagStat[] {
  const counts = new Map<string, number>()
  const add = (tag: string): void => {
    if (!tag) return
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  for (const entry of entries) {
    entry.tags.forEach(add)
    for (const card of entry.cards) {
      if (card.type === 'text') card.tags.forEach(add)
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export interface MoodStat {
  mood: string
  days: number
}

function moodOfDay(entry: DiaryEntry): string | null {
  if (entry.mood) return entry.mood
  const moodCard = entry.cards.find((card) => card.type === 'mood' && card.mood)
  if (moodCard && moodCard.type === 'mood') return moodCard.mood
  const textCard = entry.cards.find((card) => card.type === 'text' && card.mood)
  return textCard && textCard.type === 'text' ? textCard.mood : null
}

export function moodStats(entries: DiaryEntry[]): {
  distribution: MoodStat[]
  average: number | null
} {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const mood = moodOfDay(entry)
    if (!mood) continue
    counts.set(mood, (counts.get(mood) ?? 0) + 1)
  }

  const distribution = Array.from(counts.entries())
    .map(([mood, days]) => ({ mood, days }))
    .sort((a, b) => b.days - a.days)

  const scored = distribution.flatMap((item) =>
    MOOD_SCORES[item.mood] === undefined ? [] : Array(item.days).fill(MOOD_SCORES[item.mood])
  )
  const average =
    scored.length > 0 ? scored.reduce((sum: number, v: number) => sum + v, 0) / scored.length : null

  return { distribution, average }
}

/** 「今日小结」的三格：照片 / 摘录 / 待办（都按卡片张数算）。 */
export function cardTypeCounts(entry: DiaryEntry): {
  photo: number
  quote: number
  checklist: number
} {
  return {
    photo: entry.cards.filter((card) => card.type === 'photo').length,
    quote: entry.cards.filter((card) => card.type === 'quote').length,
    checklist: entry.cards.filter((card) => card.type === 'checklist').length
  }
}

export function countImages(entries: DiaryEntry[]): number {
  return entries.reduce(
    (total, entry) =>
      total +
      entry.cards.reduce((sum, card) => sum + (card.type === 'photo' ? card.images.length : 0), 0),
    0
  )
}

export interface HourBucket {
  label: string
  count: number
}

const HOUR_BUCKETS: Array<{ label: string; from: number; to: number }> = [
  { label: '06–09', from: 6, to: 9 },
  { label: '09–12', from: 9, to: 12 },
  { label: '12–15', from: 12, to: 15 },
  { label: '15–18', from: 15, to: 18 },
  { label: '18–21', from: 18, to: 21 },
  { label: '21–24', from: 21, to: 24 }
]

/** 常用时段：按卡片自己的时刻归类；没写时刻的卡片退回条目创建时刻。 */
export function hourBuckets(entries: DiaryEntry[]): HourBucket[] {
  const buckets = HOUR_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }))

  for (const entry of entries) {
    const fallbackHour = new Date(entry.createdAt).getHours()
    for (const card of entry.cards) {
      const hour = card.time ? Number(card.time.slice(0, 2)) : fallbackHour
      const index = HOUR_BUCKETS.findIndex((bucket) => hour >= bucket.from && hour < bucket.to)
      if (index >= 0) buckets[index].count += 1
    }
  }

  return buckets
}

/* ── 记录热度（日历热力图） ─────────────────────────────────── */

export interface HeatCell {
  /** null 表示这个格子不属于本月（月初补白 / 月末补白）。 */
  date: string | null
  cardCount: number
  /** 还没到的日子画虚线框。 */
  future: boolean
  /** 对应记录里的「第 3 周 · 周三」高亮（用于编排页选中的那一天）。 */
  selected?: boolean
}

/** 以周一为首日，把一个月切成 5–6 行 × 7 列。 */
export function heatmapWeeks(
  year: number,
  month: number,
  stats: Map<string, DayStat>
): HeatCell[][] {
  const firstDay = new Date(year, month, 1)
  // getDay(): 周日 = 0；转成「周一 = 0」的列号。
  const leadingBlanks = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = todayKey()

  const cells: HeatCell[] = []
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ date: null, cardCount: 0, future: false })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    cells.push({
      date: key,
      cardCount: stats.get(key)?.cardCount ?? 0,
      future: key > today
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, cardCount: 0, future: false })
  }

  const weeks: HeatCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 热度分档：0 张不填色，1–5+ 对应五档。 */
export function heatLevel(cardCount: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (cardCount <= 0) return 0
  return Math.min(5, cardCount) as 1 | 2 | 3 | 4 | 5
}

/* ── 高光时刻 ───────────────────────────────────────────────── */

export interface Highlight {
  from: string
  to: string
  title: string
  body: string
  meta: string
}

/**
 * 「本月高光」：最高产的一天与最安静的一天。
 * 只挑真实存在的记录，不编造。
 */
export function monthHighlights(monthStats: Map<string, DayStat>): Highlight[] {
  const days = Array.from(monthStats.values()).filter((stat) => stat.cardCount > 0)
  if (days.length === 0) return []

  const busiest = days.reduce((best, stat) =>
    stat.cardCount * 1000 + stat.wordCount > best.cardCount * 1000 + best.wordCount ? stat : best
  )
  const quietest = days.reduce((least, stat) =>
    stat.cardCount * 1000 + stat.wordCount < least.cardCount * 1000 + least.wordCount ? stat : least
  )

  const label = (date: string): string => date.slice(5).replace('-', '/')
  const highlights: Highlight[] = [
    {
      from: label(busiest.date),
      to: label(busiest.date),
      title: busiest.mood ? '心情最好，也写得最多' : '写得最多的一天',
      body: `放了 ${busiest.cardCount} 张卡片，${busiest.wordCount} 字。`,
      meta: `${busiest.cardCount} 张卡片 · ${busiest.wordCount} 字`
    }
  ]

  if (quietest.date !== busiest.date) {
    highlights.push({
      from: label(quietest.date),
      to: label(quietest.date),
      title: '最安静的一天',
      body: `只放了 ${quietest.cardCount} 张卡片，${quietest.wordCount} 字。`,
      meta: `${quietest.cardCount} 张卡片 · ${quietest.wordCount} 字`
    })
  }

  return highlights
}

/** 归属某天的全部图片（回顾页「本月照片」、素材库用）。 */
export interface DatedImage {
  url: string
  /** 所在条目的 id，便于点图直接跳到那一天。 */
  entryId: string
  date: string
  place: string | null
  caption: string
}

export function datedImages(entries: DiaryEntry[]): DatedImage[] {
  const images: DatedImage[] = []
  for (const entry of entries) {
    for (const card of entry.cards) {
      if (card.type !== 'photo') continue
      for (const url of card.images) {
        images.push({
          url,
          entryId: entry.id,
          date: entryDateKey(entry),
          place: card.place,
          caption: card.caption
        })
      }
    }
  }
  return images.sort((a, b) => b.date.localeCompare(a.date))
}
