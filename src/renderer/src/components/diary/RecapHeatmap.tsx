/**
 * 回顾页的「记录热度」面板。
 *
 * 热度图天生是「一个月」的形状，所以三种粒度各有各的画法，切换时不会静默忽略：
 * - 本月：`heatmapWeeks` 生成的自然月网格（周一为首日，5–6 行 × 7 列）；
 * - 本周：退化成一行七天；
 * - 今年：十二行，每月一行、每天一格，只靠颜色表达热度。
 */
import { Fragment, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { PANEL_FOOT, Panel, PanelHeader } from './JournalPrimitives'
import type { RecapScope } from './RecapPanels'
import { fromDateKey, heatLevel, heatmapWeeks, toDateKey } from '../../lib/diaryStats'
import type { DayStat } from '../../lib/diaryStats'

const WEEKDAY_HEADS = ['一', '二', '三', '四', '五', '六', '日']

/** 热度 1–5 档的底色（与样式里的 `--color-heat-*` 一一对应）。 */
const HEAT_LEVELS: Record<number, string> = {
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
  5: 'bg-heat-5'
}

/** `2026-11-07` → `11/7`。 */
function slashLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

function shiftDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/* ── 单个格子 ───────────────────────────────────────────────── */

function HeatSquare({
  date,
  cardCount,
  showCount,
  heightClass,
  onOpen
}: {
  /** null 表示这个格子不属于本月，留白。 */
  date: string | null
  cardCount: number
  showCount: boolean
  heightClass: string
  onOpen: (date: string) => void
}): JSX.Element {
  if (!date) return <span className={cn('block', heightClass)} aria-hidden="true" />

  const level = heatLevel(cardCount)
  // heat-4 底色浅，配深字；heat-5 底色深，配浅字——其余交给 ink token（暗色自动翻转）。
  const textColor = level === 5 ? '#FFF7F2' : level === 4 ? '#3A1B0D' : undefined

  return (
    <button
      type="button"
      title={`${slashLabel(date)} · ${cardCount} 张卡片`}
      onClick={(): void => onOpen(date)}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-md font-display text-[12px] transition-colors',
        heightClass,
        level === 0
          ? 'border border-dashed border-paper-divider text-ink-faint'
          : HEAT_LEVELS[level],
        level > 0 && level <= 3 && 'text-ink-strong'
      )}
      style={textColor ? { color: textColor } : undefined}
    >
      {showCount && cardCount > 0 ? cardCount : ''}
    </button>
  )
}

/* ── 面板 ───────────────────────────────────────────────────── */

export function RecapHeatmapPanel({
  scope,
  scopeStart,
  dayStats,
  onSelectDate
}: {
  scope: RecapScope
  /** 时段第一天（`YYYY-MM-DD`）：本周是周一，本月是 1 号，今年是 1 月 1 日。 */
  scopeStart: string
  dayStats: Map<string, DayStat>
  onSelectDate: (date: string) => void
}): JSX.Element {
  const anchor = useMemo(() => fromDateKey(scopeStart), [scopeStart])

  const weeks = useMemo(
    () => heatmapWeeks(anchor.getFullYear(), anchor.getMonth(), dayStats),
    [anchor, dayStats]
  )

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_unused, index) => shiftDays(scopeStart, index)),
    [scopeStart]
  )

  const yearRows = useMemo(() => {
    const year = anchor.getFullYear()
    return Array.from({ length: 12 }, (_unused, monthIndex) => {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
      const cells = Array.from({ length: 31 }, (_cell, dayIndex) => {
        if (dayIndex >= daysInMonth) return { date: null, cardCount: 0 }
        const key = toDateKey(new Date(year, monthIndex, dayIndex + 1))
        return { date: key, cardCount: dayStats.get(key)?.cardCount ?? 0 }
      })
      return { label: `${monthIndex + 1} 月`, cells }
    })
  }, [anchor, dayStats])

  const aside =
    scope === 'month'
      ? '格子里是当天的卡片数'
      : scope === 'week'
        ? '格子里是这一周的卡片数'
        : '每行一个月，只靠颜色看冷热'

  return (
    <Panel className="flex min-w-0 flex-[3_1_620px] flex-col p-[18px]">
      <PanelHeader label="记录热度" aside={aside} />

      {scope === 'month' ? (
        <div
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: '34px repeat(7, minmax(0, 1fr))' }}
        >
          {weeks.map((week, weekIndex) => (
            <Fragment key={`week-${weekIndex}`}>
              <span className="flex h-[26px] items-center text-[10.5px] text-ink">
                第 {weekIndex + 1} 周
              </span>
              {week.map((cell, cellIndex) => (
                <HeatSquare
                  key={cell.date ?? `blank-${weekIndex}-${cellIndex}`}
                  date={cell.date}
                  cardCount={cell.cardCount}
                  showCount
                  heightClass="h-[26px]"
                  onOpen={onSelectDate}
                />
              ))}
            </Fragment>
          ))}
        </div>
      ) : null}

      {scope === 'week' ? (
        <div
          className="grid gap-[5px]"
          style={{ gridTemplateColumns: '34px repeat(7, minmax(0, 1fr))' }}
        >
          <span />
          {WEEKDAY_HEADS.map((label) => (
            <span key={label} className="text-center text-[10.5px] text-ink">
              {label}
            </span>
          ))}
          <span className="flex h-[26px] items-center text-[10.5px] text-ink">本周</span>
          {weekDates.map((date) => (
            <HeatSquare
              key={date}
              date={date}
              cardCount={dayStats.get(date)?.cardCount ?? 0}
              showCount
              heightClass="h-[26px]"
              onOpen={onSelectDate}
            />
          ))}
        </div>
      ) : null}

      {scope === 'year' ? (
        <div className="flex flex-col gap-[3px]">
          {yearRows.map((row) => (
            <div
              key={row.label}
              className="grid items-center gap-[2px]"
              style={{ gridTemplateColumns: '40px repeat(31, minmax(0, 1fr))' }}
            >
              <span className="text-[10.5px] text-ink">{row.label}</span>
              {row.cells.map((cell, cellIndex) => (
                <HeatSquare
                  key={cell.date ?? `blank-${row.label}-${cellIndex}`}
                  date={cell.date}
                  cardCount={cell.cardCount}
                  showCount={false}
                  heightClass="h-4"
                  onOpen={onSelectDate}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className={cn(PANEL_FOOT, 'flex flex-wrap items-center gap-x-2 gap-y-1')}>
        <span>少</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <span key={level} className={cn('h-3 w-4 rounded-[3px]', HEAT_LEVELS[level])} />
        ))}
        <span>多</span>
        <span className="ml-auto">虚线 = 还没到的日子</span>
      </div>
    </Panel>
  )
}
