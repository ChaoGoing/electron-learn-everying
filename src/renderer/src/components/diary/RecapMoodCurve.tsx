/**
 * 回顾页的「心情曲线」面板：一手写的 SVG 折线图（不引图表库）。
 *
 * 坐标按设计稿的 660×200 画布：x 是日期在时段内的位置，y 是心情分 1–5
 * 映射到 160（1 分）–20（5 分）；网格、区域填充、极值点、注释文字都照稿子来，
 * 但每一个点都来自真实数据——没有记过心情的日子不会凭空出现。
 */
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { MOOD_LABELS } from '../../lib/diaryCards'
import { PANEL_FOOT, Panel, PanelHeader } from './JournalPrimitives'
import type { DayStat, MoodStat } from '../../lib/diaryStats'

/* 画布几何（与 viewBox="0 0 660 200" 对应） */
const X_MIN = 40
const X_MAX = 620
const Y_TOP = 20
const Y_BOTTOM = 160
const BASELINE = 170
const GRID_Y = [20, 55, 90, 125, 160]
const SCORE_STEP = (Y_BOTTOM - Y_TOP) / 4

interface SeriesPoint {
  date: string
  score: number
}

interface Coord extends SeriesPoint {
  x: number
  y: number
}

/** `2026-11-07` → `11/7`。 */
function slashLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function pointX(index: number, count: number): number {
  if (count <= 1) return (X_MIN + X_MAX) / 2
  return X_MIN + (index * (X_MAX - X_MIN)) / (count - 1)
}

/** 心情分 → 纵坐标：1 分贴底（160），5 分贴顶（20）。 */
function pointY(score: number): number {
  return Y_BOTTOM - (score - 1) * SCORE_STEP
}

/** 与上一个同粒度时段的平均分做比较。 */
function comparisonText(average: number | null, previous: number | null, label: string): string {
  if (average === null) return '还没有记心情'
  if (previous === null) return `${label}还没有记录`
  const diff = average - previous
  if (Math.abs(diff) < 0.05) return `和${label}持平`
  return `比${label}${diff > 0 ? '高' : '低'} ${Math.abs(diff).toFixed(1)}`
}

export function RecapMoodCurvePanel({
  dayStats,
  distribution,
  average,
  previousAverage,
  previousLabel,
  rangeStart,
  rangeEnd,
  recordedDays,
  dailyRecord
}: {
  dayStats: Map<string, DayStat>
  distribution: MoodStat[]
  average: number | null
  previousAverage: number | null
  /** 上一个时段的名字：上周 / 上月 / 去年。 */
  previousLabel: string
  /** 时段内有记录的日期范围（没有记录时为 null）。 */
  rangeStart: string | null
  rangeEnd: string | null
  /** 时段内有记录的天数。 */
  recordedDays: number
  /** 范围内是否一天不落（决定用「每天记一次」还是实说记了几天）。 */
  dailyRecord: boolean
}): JSX.Element {
  const series = useMemo(() => {
    const points: SeriesPoint[] = []
    for (const stat of dayStats.values()) {
      if (stat.moodScore === null) continue
      if (stat.moodScore < 1 || stat.moodScore > 5) continue
      points.push({ date: stat.date, score: stat.moodScore })
    }
    return points.sort((a, b) => a.date.localeCompare(b.date))
  }, [dayStats])

  const coords = useMemo(
    () =>
      series.map((point, index) => ({
        ...point,
        x: pointX(index, series.length),
        y: pointY(point.score)
      })),
    [series]
  )

  const linePath = useMemo(
    () =>
      coords
        .map(
          (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
        )
        .join(' '),
    [coords]
  )

  const areaPath = useMemo(() => {
    const first = coords[0]
    const last = coords[coords.length - 1]
    if (!first || !last) return ''
    return `${linePath} L${last.x.toFixed(1)} ${BASELINE} L${first.x.toFixed(1)} ${BASELINE} Z`
  }, [coords, linePath])

  const highest = coords.reduce<Coord | null>(
    (best, point) => (best === null || point.score > best.score ? point : best),
    null
  )
  const lowest = coords.reduce<Coord | null>(
    (best, point) => (best === null || point.score < best.score ? point : best),
    null
  )

  /** 最高分可能连着好几天，这时按设计稿写成区间。 */
  const bestLabel = useMemo(() => {
    if (!highest) return ''
    const best = coords.filter((point) => point.score === highest.score)
    const first = best[0]
    const last = best[best.length - 1]
    if (!first || !last) return ''
    return first.date === last.date
      ? `${slashLabel(first.date)} 心情最好`
      : `${slashLabel(first.date)} – ${slashLabel(last.date)} 心情最好`
  }, [coords, highest])

  /** x 轴取 5 个刻度（点数少于 5 就全画）。 */
  const ticks = useMemo(() => {
    if (coords.length <= 5) return coords
    const step = (coords.length - 1) / 4
    const picked = [0, 1, 2, 3, 4].map((index) => coords[Math.round(index * step)])
    return picked.filter((point, index) => point !== undefined && picked.indexOf(point) === index)
  }, [coords])

  const aside =
    rangeStart && rangeEnd
      ? `${slashLabel(rangeStart)} – ${slashLabel(rangeEnd)}，${
          dailyRecord ? '每天记一次' : `记了 ${recordedDays} 天`
        }`
      : undefined

  return (
    <Panel className="flex min-w-0 flex-[3_1_640px] flex-col p-[18px]">
      <PanelHeader label="心情曲线" aside={aside} />

      {coords.length > 0 ? (
        <svg
          viewBox="0 0 660 200"
          width="100%"
          role="img"
          aria-label="心情曲线"
          className="block w-full"
        >
          {GRID_Y.map((y) => (
            <line
              key={y}
              x1={X_MIN}
              y1={y}
              x2={X_MAX}
              y2={y}
              stroke="var(--color-paper-line-soft)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          ))}

          <path d={areaPath} fill="var(--color-terra-bright)" opacity="0.13" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-terra)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {coords.map((point) => (
            <circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              r={point === highest || point === lowest ? 5 : 3.6}
              fill="var(--color-terra)"
              stroke="var(--color-paper-card)"
              strokeWidth="2"
            />
          ))}

          {highest ? (
            <text
              x={highest.x}
              y={Math.max(12, highest.y - 12)}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-terra)"
            >
              {bestLabel}
            </text>
          ) : null}
          {lowest ? (
            <text
              x={lowest.x}
              y={Math.min(184, lowest.y + 18)}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink)"
            >
              {slashLabel(lowest.date)} 最低
            </text>
          ) : null}

          {ticks.map((point) => (
            <text
              key={`tick-${point.date}`}
              x={point.x}
              y="190"
              textAnchor="middle"
              fontSize="10.5"
              fill="var(--color-ink)"
            >
              {slashLabel(point.date)}
            </text>
          ))}
        </svg>
      ) : (
        <div className="flex min-h-[120px] items-center text-[12.5px] leading-[1.8] text-ink-soft">
          {recordedDays > 0
            ? '这几天还没有记心情，写一页时点一下心情胶囊，曲线就长出来了。'
            : '这个范围还没有记录。'}
        </div>
      )}

      <div className={cn(PANEL_FOOT, 'flex flex-wrap items-center gap-x-3 gap-y-1')}>
        <span>
          {distribution.length > 0
            ? distribution
                .map((item) => `${MOOD_LABELS[item.mood] ?? item.mood} ${item.days} 天`)
                .join(' · ')
            : '还没有心情记录'}
        </span>
        <span className="ml-auto">{comparisonText(average, previousAverage, previousLabel)}</span>
      </div>
    </Panel>
  )
}
