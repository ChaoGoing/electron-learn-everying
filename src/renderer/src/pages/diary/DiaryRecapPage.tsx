/**
 * 回顾页：设计稿 `Recap.dc.html`「回顾 · 月度统计卡片」。
 *
 * 一整块面板墙，从 store 里的条目派生出月度（或本周 / 今年）的各种口径：
 * 记录天数、字数、心情、照片、标签、热度、高光、常用时段。所有数字都来自
 * `lib/diaryStats` 的纯函数，页面只做「取哪一段数据」与「怎么连到别的页」。
 *
 * 粒度切换是本地 state：本周取本周一到周日，本月取月份游标那一月，今年取当年。
 * 面板跟着粒度一起换口径，不做「看着是本周、算的却是本月」那种静默忽略。
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { RecapHeatmapPanel } from '../../components/diary/RecapHeatmap'
import { RecapMoodCurvePanel } from '../../components/diary/RecapMoodCurve'
import {
  RecapEmptyPanel,
  RecapHighlightsPanel,
  RecapHourPanel,
  RecapMoodAveragePanel,
  RecapPhotoPanel,
  RecapPhotosPanel,
  RecapScopePanel,
  RecapStreakPanel,
  RecapTagPanel,
  RecapWordsPanel,
  type RecapScope
} from '../../components/diary/RecapPanels'
import { useDiaryStore } from '../../stores/diaryStore'
import {
  buildDayStats,
  computeStreak,
  countImages,
  datedImages,
  entryDateKey,
  fromDateKey,
  hourBuckets,
  monthEntries,
  monthHighlights,
  moodStats,
  tagStats,
  toDateKey,
  todayKey
} from '../../lib/diaryStats'
import type { DayStat } from '../../lib/diaryStats'
import type { DiaryEntry } from '../../../../shared/types/diary'

/** 照片面板里最多摆几张。 */
const THUMB_COUNT = 3
const PHOTO_WALL_COUNT = 4

/* ── 时段计算 ───────────────────────────────────────────────── */

const pad2 = (value: number): string => value.toString().padStart(2, '0')

/** `2026-11-07` → `11/7`（设计稿的日期写法）。 */
function slashLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function shiftDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** 本周周一的日期键（周一为首日）。 */
function weekStartKey(base: Date): string {
  const offset = (base.getDay() + 6) % 7
  return toDateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset))
}

function daysInYear(year: number): number {
  return (new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / 86_400_000
}

function entriesInRange(entries: DiaryEntry[], start: string, end: string): DiaryEntry[] {
  return entries.filter((entry) => {
    const key = entryDateKey(entry)
    return key >= start && key <= end
  })
}

/** 时段内从第一天到今天是否一天都没落下（时段还没走完就只看到今天）。 */
function isPeriodUnbroken(dayStats: Map<string, DayStat>, start: string, end: string): boolean {
  if (dayStats.size === 0) return false
  const today = todayKey()
  const last = end < today ? end : today
  if (start > last) return false

  let cursor = start
  while (cursor <= last) {
    if (!dayStats.has(cursor)) return false
    cursor = shiftDays(cursor, 1)
  }
  return true
}

interface PeriodRange {
  start: string
  end: string
  /** 上一个同粒度时段的名字：上周 / 上月 / 去年。 */
  label: string
}

interface RecapScopeData {
  entries: DiaryEntry[]
  dayStats: Map<string, DayStat>
  start: string
  end: string
  /** 面板标题里的时段名：本周 / 本月 / 今年。 */
  periodName: string
  /** 大标题，如「11月回顾」。 */
  title: string
  /** 大标题上方的小字：本月是年份，本周是日期区间。 */
  eyebrow: string
  /** 时段的自然天数（周 7 / 月 28–31 / 年 365–366）。 */
  totalDays: number
  previous: PeriodRange
  previousEntries: DiaryEntry[]
}

function buildScope(
  scope: RecapScope,
  entries: DiaryEntry[],
  year: number,
  month: number
): RecapScopeData {
  let start: string
  let end: string
  let totalDays: number
  let periodName: string
  let title: string
  let eyebrow: string
  let previous: PeriodRange
  let scoped: DiaryEntry[]

  if (scope === 'week') {
    start = weekStartKey(new Date())
    end = shiftDays(start, 6)
    totalDays = 7
    periodName = '本周'
    title = '本周回顾'
    eyebrow = `${slashLabel(start)} – ${slashLabel(end)}`
    previous = { start: shiftDays(start, -7), end: shiftDays(start, -1), label: '上周' }
    scoped = entriesInRange(entries, start, end)
  } else if (scope === 'year') {
    start = `${year}-01-01`
    end = `${year}-12-31`
    totalDays = daysInYear(year)
    periodName = '今年'
    title = `${year}年回顾`
    eyebrow = `${year}`
    previous = { start: `${year - 1}-01-01`, end: `${year - 1}-12-31`, label: '去年' }
    scoped = entriesInRange(entries, start, end)
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate()
    start = `${year}-${pad2(month + 1)}-01`
    end = `${year}-${pad2(month + 1)}-${pad2(lastDay)}`
    totalDays = lastDay
    periodName = '本月'
    title = `${month + 1}月回顾`
    eyebrow = `${year}`

    const previousDate = new Date(year, month - 1, 1)
    const previousLast = new Date(
      previousDate.getFullYear(),
      previousDate.getMonth() + 1,
      0
    ).getDate()
    const previousPrefix = `${previousDate.getFullYear()}-${pad2(previousDate.getMonth() + 1)}`
    previous = {
      start: `${previousPrefix}-01`,
      end: `${previousPrefix}-${pad2(previousLast)}`,
      label: '上月'
    }
    scoped = monthEntries(entries, year, month)
  }

  return {
    entries: scoped,
    dayStats: buildDayStats(scoped),
    start,
    end,
    periodName,
    title,
    eyebrow,
    totalDays,
    previous,
    previousEntries: entriesInRange(entries, previous.start, previous.end)
  }
}

/* ── 页面 ───────────────────────────────────────────────────── */

export default function DiaryRecapPage(): JSX.Element {
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const year = useDiaryStore((state) => state.year)
  const month = useDiaryStore((state) => state.month)
  const selectDate = useDiaryStore((state) => state.selectDate)

  const [scope, setScope] = useState<RecapScope>('month')

  const data = useMemo(() => buildScope(scope, entries, year, month), [scope, entries, year, month])
  const streak = useMemo(() => computeStreak(entries, year, month), [entries, year, month])
  const mood = useMemo(() => moodStats(data.entries), [data.entries])
  const previousMood = useMemo(() => moodStats(data.previousEntries), [data.previousEntries])
  const tags = useMemo(() => tagStats(data.entries), [data.entries])
  const hours = useMemo(() => hourBuckets(data.entries), [data.entries])
  const highlights = useMemo(() => monthHighlights(data.dayStats), [data.dayStats])
  const photos = useMemo(() => datedImages(data.entries), [data.entries])
  const photoCount = useMemo(() => countImages(data.entries), [data.entries])

  /* 数值派生：全部从 `dayStats` 汇总，不另算一套字数口径。 */

  const totalWords = useMemo(() => {
    let sum = 0
    for (const stat of data.dayStats.values()) sum += stat.wordCount
    return sum
  }, [data.dayStats])

  const cardTotal = useMemo(() => {
    let sum = 0
    for (const stat of data.dayStats.values()) sum += stat.cardCount
    return sum
  }, [data.dayStats])

  const longest = useMemo(() => {
    let best: DayStat | null = null
    for (const stat of data.dayStats.values()) {
      if (stat.wordCount <= 0) continue
      if (best === null || stat.wordCount > best.wordCount) best = stat
    }
    return best ? { words: best.wordCount, label: slashLabel(best.date) } : null
  }, [data.dayStats])

  /** 1–5 分各有几天（平均心情面板的色条）。 */
  const scoreDays = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    for (const stat of data.dayStats.values()) {
      if (stat.moodScore === null || stat.moodScore < 1 || stat.moodScore > 5) continue
      counts[stat.moodScore - 1] += 1
    }
    return counts
  }, [data.dayStats])

  const recordedRange = useMemo(() => {
    const keys = Array.from(data.dayStats.keys()).sort()
    if (keys.length === 0) return null
    return { start: keys[0], end: keys[keys.length - 1] }
  }, [data.dayStats])

  const unbroken = useMemo(
    () => isPeriodUnbroken(data.dayStats, data.start, data.end),
    [data.dayStats, data.start, data.end]
  )

  const dailyRecord = useMemo(
    () =>
      recordedRange
        ? isPeriodUnbroken(data.dayStats, recordedRange.start, recordedRange.end)
        : false,
    [data.dayStats, recordedRange]
  )

  const recordedDays = scope === 'month' ? streak.monthDays : data.dayStats.size
  const averageWords = recordedDays > 0 ? Math.round(totalWords / recordedDays) : 0

  /* ── 交互 ─────────────────────────────────────────────────── */

  const openDate = useCallback(
    (date: string): void => {
      selectDate(date)
      navigate('/diary')
    },
    [navigate, selectDate]
  )

  const writeOne = useCallback((): void => {
    navigate('/diary')
  }, [navigate])

  // 导出 PDF 与生成年度回顾属于后续功能：入口按设计稿留在原位，但不假装已经导出。
  const exportPdf = useCallback((): void => {
    console.info('回顾导出为 PDF：尚未实现')
  }, [])

  const generateYear = useCallback((): void => {
    console.info('生成年度回顾：尚未实现')
  }, [])

  return (
    <>
      <JournalToolbar view="recap" />

      <main className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[30px] pt-[22px]">
        <div className="flex flex-wrap items-stretch gap-4">
          <RecapScopePanel
            scope={scope}
            eyebrow={data.eyebrow}
            title={data.title}
            onScopeChange={setScope}
            onExportPdf={exportPdf}
            onGenerateYear={generateYear}
          />

          {data.entries.length === 0 ? (
            <RecapEmptyPanel periodName={data.periodName} onWrite={writeOne} />
          ) : (
            <>
              <RecapStreakPanel
                dayCount={recordedDays}
                totalDays={data.totalDays}
                currentStreak={streak.current}
                unbroken={unbroken}
              />
              <RecapWordsPanel
                totalWords={totalWords}
                averageWords={averageWords}
                longest={longest}
              />
              <RecapMoodAveragePanel average={mood.average} scoreDays={scoreDays} />
              <RecapPhotoPanel
                count={photoCount}
                images={photos.slice(0, THUMB_COUNT)}
                onOpenDate={openDate}
              />

              <RecapMoodCurvePanel
                dayStats={data.dayStats}
                distribution={mood.distribution}
                average={mood.average}
                previousAverage={previousMood.average}
                previousLabel={data.previous.label}
                rangeStart={recordedRange?.start ?? null}
                rangeEnd={recordedRange?.end ?? null}
                recordedDays={data.dayStats.size}
                dailyRecord={dailyRecord}
              />

              <RecapTagPanel tags={tags} />

              <RecapHeatmapPanel
                scope={scope}
                scopeStart={data.start}
                dayStats={data.dayStats}
                onSelectDate={openDate}
              />

              <RecapPhotosPanel
                periodName={data.periodName}
                total={photoCount}
                images={photos.slice(0, PHOTO_WALL_COUNT)}
                onOpenDate={openDate}
              />
              <RecapHighlightsPanel periodName={data.periodName} highlights={highlights} />
              <RecapHourPanel buckets={hours} cardTotal={cardTotal} />
            </>
          )}
        </div>
      </main>
    </>
  )
}
