/**
 * 卡片板上的固定面板：今日小结、迷你月历、连续记录、标签、本月心情、
 * 素材（拖到板上）、编排模板、今日提示。
 *
 * 这些不是用户卡片（不进 `entry.cards`），而是从数据派生出来的"家具"，
 * 因此放在一个文件里统一维护。
 */
import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Image as ImageIcon,
  Lightbulb,
  MapPin,
  Music2,
  PenLine,
  RefreshCw,
  Smile,
  Type
} from 'lucide-react'
import { COMPOSE_TEMPLATES, MOOD_EMOJIS, MOOD_LABELS } from '../../lib/diaryCards'
import { cn } from '../../lib/cn'
import {
  JournalButton,
  JournalIconButton,
  Panel,
  PanelHeader,
  StatNumber
} from './JournalPrimitives'
import { CARD_TYPE_LABELS } from '../../../../shared/types/diary'
import type { DiaryCardType, DiaryEntry, ImageAsset } from '../../../../shared/types/diary'

/* ── 今日小结 ───────────────────────────────────────────────── */

export function TodaySummaryPanel({ entry }: { entry: DiaryEntry | null }): JSX.Element {
  const counts = useMemo(() => {
    const cards = entry?.cards ?? []
    return {
      photo: cards.filter((card) => card.type === 'photo').length,
      quote: cards.filter((card) => card.type === 'quote').length,
      text: cards.filter((card) => card.type === 'text').length
    }
  }, [entry])

  return (
    <Panel className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <PanelHeader label="今日小结" />
      <div className="flex items-baseline gap-1.5">
        <StatNumber value={entry?.cards.length ?? 0} unit="张卡片" />
        <span className="ml-auto text-xs text-ink">{entry?.wordCount ?? 0} 字</span>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-dashed border-paper-line-soft pt-[13px]">
        {(
          [
            ['photo', counts.photo],
            ['quote', counts.quote],
            ['text', counts.text]
          ] as Array<[DiaryCardType, number]>
        ).map(([type, count]) => (
          <div key={type}>
            <StatNumber value={count} size="md" />
            <div className="mt-0.5 text-[11px] text-ink">{CARD_TYPE_LABELS[type]}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ── 迷你月历 ───────────────────────────────────────────────── */

const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']

export function MiniCalendarPanel({
  year,
  month,
  selectedDate,
  datesWithEntries,
  onSelect,
  onMonthChange
}: {
  year: number
  month: number
  selectedDate: string
  datesWithEntries: Set<string>
  onSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}): JSX.Element {
  const weeks = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<string | null> = Array(firstWeekday).fill(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(
        `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      )
    }
    while (cells.length % 7 !== 0) cells.push(null)
    const rows: Array<Array<string | null>> = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [year, month])

  const shiftMonth = (delta: number): void => {
    const next = new Date(year, month + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }

  return (
    <Panel className="flex min-w-0 flex-[1_1_300px] flex-col p-[18px]">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="font-display text-sm font-semibold tracking-[0.04em] text-ink-strong">
          {year} · {month + 1}月
        </span>
        <JournalIconButton
          tone="bare"
          size={26}
          aria-label="上一月"
          className="ml-auto text-ink"
          onClick={(): void => shiftMonth(-1)}
        >
          <ChevronLeft size={14} />
        </JournalIconButton>
        <JournalIconButton
          tone="bare"
          size={26}
          aria-label="下一月"
          className="text-ink"
          onClick={(): void => shiftMonth(1)}
        >
          <ChevronRight size={14} />
        </JournalIconButton>
      </div>

      <div className="mb-[3px] grid grid-cols-7 gap-0.5">
        {WEEK_HEAD.map((label) => (
          <div key={label} className="text-center text-[10.5px] text-ink">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((date, index) => {
          if (!date) return <div key={`blank-${index}`} className="h-[26px]" />
          const isSelected = date === selectedDate
          const hasEntry = datesWithEntries.has(date)
          return (
            <button
              key={date}
              type="button"
              onClick={(): void => onSelect(date)}
              className={[
                'relative flex h-[26px] cursor-pointer items-center justify-center rounded-[8px] text-[11.5px]',
                isSelected
                  ? 'bg-terra font-semibold text-paper-card'
                  : 'text-ink hover:bg-paper-sunken'
              ].join(' ')}
            >
              {Number(date.slice(-2))}
              {hasEntry ? (
                <span
                  className="absolute bottom-0.5 left-1/2 size-[3px] -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#F0D6C6' : 'var(--color-terra-bright)' }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

/* ── 连续记录 ───────────────────────────────────────────────── */

export function StreakPanel({
  year,
  month,
  datesWithEntries,
  current,
  longest,
  unbroken
}: {
  year: number
  month: number
  datesWithEntries: Set<string>
  current: number
  longest: number
  unbroken: boolean
}): JSX.Element {
  const cells = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: days }, (_unused, index) => {
      const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${(index + 1)
        .toString()
        .padStart(2, '0')}`
      return { key, hasEntry: datesWithEntries.has(key) }
    })
  }, [year, month, datesWithEntries])

  return (
    <Panel className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <div className="mb-[13px] flex items-baseline gap-2">
        <span className="text-[11px] tracking-[0.1em] text-ink-soft">连续记录</span>
        <span className="ml-auto font-display text-[15px] font-semibold text-ink-strong">
          {current} 天
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <span
            key={cell.key}
            title={cell.key}
            className="h-3.5 rounded-[4px]"
            style={{
              backgroundColor: cell.hasEntry
                ? 'var(--color-terra-bright)'
                : 'var(--color-paper-divider)'
            }}
          />
        ))}
      </div>
      <div className="mt-auto border-t border-dashed border-paper-line-soft pt-[13px] text-[11.5px] leading-[1.8] text-ink">
        {unbroken ? '本月还没有断过。' : '本月有几天空着，没关系。'}
        <br />
        最长连续记录：{longest} 天
      </div>
    </Panel>
  )
}

/* ── 标签 ───────────────────────────────────────────────────── */

const TAG_DOTS = ['#a84a2a', '#5f7355', '#c4693f', '#96742f', '#5b5a8c', '#7a5c22']

export function TagsPanel({ tags }: { tags: Array<{ tag: string; count: number }> }): JSX.Element {
  const total = tags.reduce((sum, item) => sum + item.count, 0)

  return (
    <Panel className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[11px] tracking-[0.1em] text-ink-soft">标签</span>
        <span className="ml-auto text-[11.5px] text-ink">共 {total} 条</span>
      </div>
      <div className="flex flex-col gap-[3px]">
        <span className="flex h-[30px] items-center gap-2 rounded-[9px] bg-paper-selected px-2.5 text-[12.5px] font-medium text-ink-strong">
          <span className="size-1.5 rounded-full bg-terra" />
          全部
          <span className="ml-auto text-[11px] font-normal text-ink">{total}</span>
        </span>
        {tags.slice(0, 5).map((item, index) => (
          <span
            key={item.tag}
            className="flex h-[30px] items-center gap-2 rounded-[9px] px-2.5 text-[12.5px] text-ink"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: TAG_DOTS[index % TAG_DOTS.length] }}
            />
            {item.tag}
            <span className="ml-auto text-[11px] text-ink">{item.count}</span>
          </span>
        ))}
        {tags.length === 0 ? (
          <span className="px-2.5 py-1 text-[12px] text-ink-soft">本月还没有标签</span>
        ) : null}
      </div>
    </Panel>
  )
}

/* ── 本月心情 ───────────────────────────────────────────────── */

export function MoodPanel({
  distribution,
  average
}: {
  distribution: Array<{ mood: string; days: number }>
  average: number | null
}): JSX.Element {
  const byMood = new Map(distribution.map((item) => [item.mood, item.days]))
  const rows = ['happy', 'neutral', 'grateful', 'sad', 'tired']

  return (
    <Panel className="flex min-w-0 flex-[1_1_260px] flex-col p-[18px]">
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="text-[11px] tracking-[0.1em] text-ink-soft">本月心情</span>
        <span className="ml-auto text-[11.5px] text-ink">
          {average === null ? '还没有记录' : `平均 ${average.toFixed(1)}`}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {rows.map((mood) => (
          <span
            key={mood}
            className="flex h-[30px] items-center gap-2.5 rounded-[9px] px-2.5 text-[12.5px] text-ink-strong"
          >
            <span>{MOOD_EMOJIS[mood]}</span>
            {MOOD_LABELS[mood]}
            <span className="ml-auto font-display text-[13px] text-ink">
              {byMood.get(mood) ?? 0} 天
            </span>
          </span>
        ))}
      </div>
    </Panel>
  )
}

/* ── 素材 · 拖到板上 ───────────────────────────────────────── */

const MATERIAL_SOURCES: Array<{ type: DiaryCardType; icon: typeof Type }> = [
  { type: 'photo', icon: ImageIcon },
  { type: 'text', icon: Type },
  { type: 'mood', icon: Smile },
  { type: 'weather', icon: CloudSun },
  { type: 'music', icon: Music2 },
  { type: 'location', icon: MapPin }
]

export function MaterialsPanel({
  recentImages,
  onAddCard,
  onDragCard
}: {
  recentImages: ImageAsset[]
  onAddCard: (type: DiaryCardType) => void
  onDragCard: (type: DiaryCardType) => void
}): JSX.Element {
  return (
    <Panel className="flex w-full min-w-0 flex-col p-[18px]">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[11px] tracking-[0.1em] text-ink-soft">素材 · 拖到板上</span>
        <span className="ml-auto text-[11px] text-ink">按住拖动</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MATERIAL_SOURCES.map((source) => (
          <button
            key={source.type}
            type="button"
            draggable
            onDragStart={(event): void => {
              // Chromium 下原生拖拽必须写一点 dataTransfer 数据，否则拖拽可能不启动。
              event.dataTransfer.setData('text/plain', `diary-card:${source.type}`)
              event.dataTransfer.effectAllowed = 'copy'
              onDragCard(source.type)
            }}
            onClick={(): void => onAddCard(source.type)}
            className="flex h-[60px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-paper-line-dash bg-paper-surface text-[11px] text-ink hover:bg-paper-sunken"
          >
            <source.icon size={16} />
            {CARD_TYPE_LABELS[source.type]}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-dashed border-paper-line-soft pt-[13px]">
        {recentImages.length > 0 ? (
          <>
            <div className="mb-2 text-[11px] text-ink-soft">最近用过的</div>
            <div className="flex gap-2">
              {recentImages.slice(0, 3).map((image) => (
                <img
                  key={image.url}
                  src={image.url}
                  alt={image.name}
                  className="h-11 w-14 rounded-[9px] border border-paper-line-dash-strong object-cover"
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-[11.5px] text-ink">
            点一下就能落一张空白卡片，也可以直接拖到板上。
          </div>
        )}
      </div>
    </Panel>
  )
}

/* ── 编排模板 ───────────────────────────────────────────────── */

export function TemplatesPanel({
  onApply,
  targetLabel = '今天',
  disabled = false
}: {
  onApply: (templateId: string) => void
  /** 面板右上角的说明用词：卡片板说「今天」，编排模式说「这一天」。 */
  targetLabel?: string
  /** 这一天还没有卡片时置灰——套模板只改排列，没有卡片可排。 */
  disabled?: boolean
}): JSX.Element {
  const ACCENT = 'var(--color-terra-bright)'
  const NEUTRAL = '#D8CCB2'
  const FAINT = '#E2D8C2'

  return (
    <Panel className="flex w-full min-w-0 flex-col p-[18px]">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[11px] tracking-[0.1em] text-ink-soft">编排模板</span>
        <span className="ml-auto text-[11px] text-ink">一键套用到{targetLabel}</span>
      </div>
      <div className={cn('grid grid-cols-3 gap-3', disabled && 'opacity-45')}>
        {COMPOSE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            title={template.hint}
            disabled={disabled}
            onClick={(): void => onApply(template.id)}
            className="flex cursor-pointer flex-col gap-2.5 rounded-xl border border-paper-line-dash-strong bg-paper-surface p-3 text-left text-xs text-ink-strong hover:bg-paper-sunken disabled:cursor-not-allowed disabled:hover:bg-paper-surface"
          >
            {/* 不固定高度、也不拉伸：让预览按 viewBox 的比例自己缩放，
                这样它在 300px 的侧栏里和宽栏里都是同一种观感。 */}
            <svg viewBox="0 0 100 52" aria-hidden="true" className="block h-auto w-full">
              <rect
                x="0.5"
                y="0.5"
                width="99"
                height="51"
                rx="5"
                fill="#F5EFE1"
                stroke="var(--color-paper-line-dash-strong)"
              />
              {template.preview.map((block, index) => (
                <rect
                  key={index}
                  x={block.x}
                  y={block.y}
                  width={block.w}
                  height={block.h}
                  rx="3"
                  fill={block.accent ? ACCENT : index === 0 ? NEUTRAL : FAINT}
                />
              ))}
            </svg>
            {template.label}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-dashed border-paper-line-soft pt-[13px] text-[11.5px] text-ink">
        {disabled
          ? '先放一张卡片，模板才有东西可排。'
          : '套用模板只改排列顺序与版式宽度，不会删掉任何一张卡片。'}
      </div>
    </Panel>
  )
}

/* ── 今日提示 ───────────────────────────────────────────────── */
const PROMPTS = [
  '今天有没有哪件小事，当时觉得不值一提，现在想起来却有点意思？',
  '如果今天只留下一张照片，你会选哪一张？为什么？',
  '今天有没有一个瞬间，你忽然觉得慢下来了？',
  '写一件今天做成的小事，哪怕只是准时吃饭。',
  '今天有没有谁说过一句话，让你记到现在？',
  '今天的天气让你想起了哪一天？'
]

export function PromptPanel({ onWrite }: { onWrite: () => void }): JSX.Element {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length))

  return (
    <Panel tone="dashed" className="flex w-full min-w-0 flex-col p-[18px]">
      <PanelHeader label="今日提示" icon={<Lightbulb size={13} />} />
      <p className="m-0 font-serif text-[15px] leading-[1.9] text-ink-strong">{PROMPTS[index]}</p>
      <div className="mt-auto flex gap-2 pt-3.5">
        <JournalButton tone="primary" onClick={onWrite} className="flex-1">
          <PenLine size={14} />
          写一页
        </JournalButton>
        <JournalIconButton
          aria-label="换一个提示"
          onClick={(): void => setIndex((current) => (current + 1) % PROMPTS.length)}
        >
          <RefreshCw size={15} />
        </JournalIconButton>
      </div>
    </Panel>
  )
}
