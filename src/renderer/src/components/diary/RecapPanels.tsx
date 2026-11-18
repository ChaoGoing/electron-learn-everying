/**
 * 回顾页的统计面板：月份与导出、记录天数、写字、平均心情、照片、标签分布、
 * 本月照片、本月高光、常用时段。
 *
 * 与 `InsightPanels` 一样，这些不是用户卡片，而是从真实数据派生出来的"家具"；
 * 面板本身只接收算好的数字与文案——口径统一由 `pages/diary/DiaryRecapPage`
 * 调用 `lib/diaryStats` 负责，避免回顾页与卡片板的数字对不上。
 */
import {
  CalendarDays,
  Gauge,
  Image as ImageIcon,
  MoonStar,
  PenLine,
  Smile,
  Sparkles
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  JournalButton,
  PANEL_FOOT,
  Panel,
  PanelHeader,
  ProgressBar,
  SegmentedControl,
  StatNumber
} from './JournalPrimitives'
import type { DatedImage, Highlight, HourBucket, TagStat } from '../../lib/diaryStats'

/** 回顾粒度：本周 / 本月 / 今年。 */
export type RecapScope = 'week' | 'month' | 'year'

const SCOPE_OPTIONS: Array<{ value: RecapScope; label: string }> = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' }
]

/** `2026-11-07` → `11/7`（设计稿的日期写法）。 */
function slashLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

/* ── 1. 月份与导出 ──────────────────────────────────────────── */

export function RecapScopePanel({
  scope,
  eyebrow,
  title,
  onScopeChange,
  onExportPdf,
  onGenerateYear
}: {
  scope: RecapScope
  /** 大标题上方的小字：本月是年份，本周是日期区间。 */
  eyebrow: string
  title: string
  onScopeChange: (scope: RecapScope) => void
  onExportPdf: () => void
  onGenerateYear: () => void
}): JSX.Element {
  return (
    <Panel tone="warm" className="flex min-w-0 flex-[1_1_300px] flex-col p-[18px]">
      <div className="font-display text-[13px] tracking-[0.1em] text-ink-soft">{eyebrow}</div>
      <h2 className="m-0 font-display text-[30px] font-semibold leading-[1.1] text-ink-strong">
        {title}
      </h2>

      <SegmentedControl<RecapScope>
        options={SCOPE_OPTIONS}
        value={scope}
        onChange={onScopeChange}
        className="mt-3.5 self-start"
      />

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <JournalButton tone="primary" size="sm" onClick={onExportPdf} className="w-full">
          导出为 PDF
        </JournalButton>
        <JournalButton tone="outline" size="sm" onClick={onGenerateYear} className="w-full">
          生成年度回顾
        </JournalButton>
      </div>
    </Panel>
  )
}

/* ── 2. 记录天数 ────────────────────────────────────────────── */

export function RecapStreakPanel({
  dayCount,
  totalDays,
  currentStreak,
  unbroken
}: {
  dayCount: number
  totalDays: number
  currentStreak: number
  unbroken: boolean
}): JSX.Element {
  return (
    <Panel className="flex min-w-0 flex-[1_1_240px] flex-col p-[18px]">
      <PanelHeader label="记录天数" icon={<Gauge size={13} className="text-ink-soft" />} />
      <StatNumber value={dayCount} unit={`/ ${totalDays} 天`} size="xl" className="tabular-nums" />
      <ProgressBar value={totalDays > 0 ? dayCount / totalDays : 0} className="mt-3.5" />
      <div className={PANEL_FOOT}>
        连续记录 {currentStreak} 天，{unbroken ? '还没断过' : '中间有几天空着'}。
      </div>
    </Panel>
  )
}

/* ── 3. 写字 ────────────────────────────────────────────────── */

export function RecapWordsPanel({
  totalWords,
  averageWords,
  longest
}: {
  totalWords: number
  /** 每个记录日的平均字数。 */
  averageWords: number
  longest: { words: number; label: string } | null
}): JSX.Element {
  return (
    <Panel className="flex min-w-0 flex-[1_1_240px] flex-col p-[18px]">
      <PanelHeader label="写字" icon={<PenLine size={13} className="text-ink-soft" />} />
      <StatNumber
        value={totalWords.toLocaleString('zh-CN')}
        unit="字"
        size="xl"
        className="tabular-nums"
      />
      <div className={cn(PANEL_FOOT, 'leading-[1.8]')}>
        <div>平均每天 {averageWords.toLocaleString('zh-CN')} 字</div>
        <div>
          {longest
            ? `最长的一篇 ${longest.words.toLocaleString('zh-CN')} 字（${longest.label}）`
            : '还没有写下正文'}
        </div>
      </div>
    </Panel>
  )
}

/* ── 4. 平均心情 ────────────────────────────────────────────── */

/** 1–5 分档的色条：低分偏陶土红，高分偏灰绿。 */
const SCORE_COLORS = [
  'var(--color-terra)',
  'var(--color-terra-bright)',
  'var(--color-amber)',
  '#7a8a63',
  'var(--color-moss)'
]

export function RecapMoodAveragePanel({
  average,
  scoreDays
}: {
  average: number | null
  /** 长度 5 的数组：1–5 分各有几天。 */
  scoreDays: number[]
}): JSX.Element {
  const moodDays = scoreDays.reduce((sum, count) => sum + count, 0)

  return (
    <Panel className="flex min-w-0 flex-[1_1_240px] flex-col p-[18px]">
      <PanelHeader label="平均心情" icon={<Smile size={13} className="text-ink-soft" />} />
      <StatNumber
        value={average === null ? '—' : average.toFixed(1)}
        unit="/ 5"
        size="xl"
        className="tabular-nums"
      />
      <div className="mt-3.5 flex gap-1">
        {scoreDays.map((count, index) => (
          <span
            key={index}
            title={`${index + 1} 分 · ${count} 天`}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor: count > 0 ? SCORE_COLORS[index] : 'var(--color-paper-selected)'
            }}
          />
        ))}
      </div>
      <div className={PANEL_FOOT}>
        {moodDays > 0 && average !== null
          ? `${moodDays} 天记了心情，平均 ${average.toFixed(1)} 分。`
          : '这个范围还没有记心情。'}
      </div>
    </Panel>
  )
}

/* ── 5. 照片 ────────────────────────────────────────────────── */

export function RecapPhotoPanel({
  count,
  images,
  onOpenDate
}: {
  count: number
  /** 最近的三张（已按日期倒序）。 */
  images: DatedImage[]
  onOpenDate: (date: string) => void
}): JSX.Element {
  const days = new Set(images.map((image) => image.date)).size

  return (
    <Panel className="flex min-w-0 flex-[1_1_240px] flex-col p-[18px]">
      <PanelHeader label="照片" icon={<ImageIcon size={13} className="text-ink-soft" />} />
      <StatNumber
        value={count.toLocaleString('zh-CN')}
        unit="张"
        size="xl"
        className="tabular-nums"
      />

      {images.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              title={`${slashLabel(image.date)}${image.place ? ` · ${image.place}` : ''}`}
              onClick={(): void => onOpenDate(image.date)}
              className="cursor-pointer overflow-hidden rounded-[9px] border border-paper-line-dash-strong"
            >
              <img src={image.url} alt={image.caption} className="h-11 w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className={PANEL_FOOT}>
        {count > 0 ? `${count} 张照片，来自 ${days} 天。` : '还没有照片，写一页时放一张试试。'}
      </div>
    </Panel>
  )
}

/* ── 6. 标签分布 ────────────────────────────────────────────── */

/** 标签条的取色顺序（设计稿的五个色）：灰绿 / 陶土 / 赭石 / 靛 / 砖红。 */
const TAG_COLORS = ['#5F7355', '#C4693F', '#96742F', '#5B5A8C', '#A84A2A']

export function RecapTagPanel({ tags }: { tags: TagStat[] }): JSX.Element {
  const total = tags.reduce((sum, item) => sum + item.count, 0)
  const rows = tags.slice(0, 5)
  const top = rows[0]

  return (
    <Panel className="flex min-w-0 flex-[1_1_380px] flex-col p-[18px]">
      <PanelHeader label="标签分布" aside={`${total} 条`} />

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((item, index) => {
            const percent = total > 0 ? (item.count / total) * 100 : 0
            return (
              <div key={item.tag}>
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[12.5px] text-ink-strong">{item.tag}</span>
                  <span className="ml-auto font-display text-[13px] text-ink">{item.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-selected">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: TAG_COLORS[index % TAG_COLORS.length]
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-2 text-[12px] text-ink-soft">这个范围还没有标签。</div>
      )}

      <div className={PANEL_FOOT}>
        {top ? tagObservation(top, total) : '给卡片加上标签，这里就能看出偏爱。'}
      </div>
    </Panel>
  )
}

/** 一句话观察：占比高时用设计稿的"将近四成"这类说法。 */
function tagObservation(top: TagStat, total: number): string {
  const percent = total > 0 ? Math.round((top.count / total) * 100) : 0
  if (percent >= 35) return `「${top.tag}」占了将近四成。`
  if (percent >= 25) return `「${top.tag}」占了大约四分之一。`
  return `「${top.tag}」出现最多，占了 ${percent}%。`
}

/* ── 7. 本月照片 ────────────────────────────────────────────── */

export function RecapPhotosPanel({
  periodName,
  total,
  images,
  onOpenDate
}: {
  periodName: string
  total: number
  /** 最近的四张（已按日期倒序）。 */
  images: DatedImage[]
  onOpenDate: (date: string) => void
}): JSX.Element {
  return (
    <Panel className="flex min-w-0 flex-[2_1_420px] flex-col p-[18px]">
      <PanelHeader label={`${periodName}照片`} aside={`${total} 张 · 最近 4 张`} />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={(): void => onOpenDate(image.date)}
              className="cursor-pointer text-left"
            >
              <img
                src={image.url}
                alt={image.caption}
                className="h-24 w-full rounded-[10px] border border-paper-line-soft object-cover"
              />
              <div className="mt-1.5 truncate text-[11.5px] text-ink">
                {slashLabel(image.date)}
                {image.place ? ` · ${image.place}` : ''}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-2 text-[12px] text-ink-soft">这个范围还没有照片。</div>
      )}

      <div className={PANEL_FOOT}>
        {total > images.length
          ? `还有 ${total - images.length} 张在素材里，点一张就跳到那天。`
          : '点一张图就跳到那一天。'}
      </div>
    </Panel>
  )
}

/* ── 8. 本月高光 ────────────────────────────────────────────── */

export function RecapHighlightsPanel({
  periodName,
  highlights
}: {
  periodName: string
  highlights: Highlight[]
}): JSX.Element {
  return (
    <Panel tone="warm" className="flex min-w-0 flex-[2_1_560px] flex-col p-[18px]">
      <PanelHeader label={`${periodName}高光`} aside="自动挑出来的两天" />

      {highlights.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {highlights.map((item, index) => {
            const Icon = index === 0 ? Sparkles : MoonStar
            return (
              <article
                key={`${item.from}-${index}`}
                className="flex flex-col rounded-[13px] border border-paper-line-soft bg-paper-card p-3.5"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <Icon size={12} />
                  {item.from} – {item.to}
                </div>
                <h3 className="m-0 mt-1.5 font-serif text-[15px] font-semibold text-ink-strong">
                  {item.title}
                </h3>
                <p className="m-0 mt-1.5 font-serif text-[12.5px] leading-[1.8] text-ink">
                  {item.body}
                </p>
                <div className="mt-auto pt-2 text-[11px] text-ink-soft">{item.meta}</div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="py-2 text-[12px] text-ink-soft">记录满几天，这里会自己挑出高光。</div>
      )}

      <div className={PANEL_FOOT}>只挑真实写过的日子，不编造。</div>
    </Panel>
  )
}

/* ── 9. 常用时段 ────────────────────────────────────────────── */

/** 时段标签 → 中文说法（与 `diaryStats` 的 `HOUR_BUCKETS` 标签一一对应）。 */
const HOUR_NAMES: Record<string, string> = {
  '06–09': '早上六点到九点',
  '09–12': '上午九点到十二点',
  '12–15': '午后十二点到三点',
  '15–18': '下午三点到六点',
  '18–21': '傍晚六点到九点',
  '21–24': '夜里九点到十二点'
}

/** 把占比说成设计稿那种口语（将近一半 / 三分之一）。 */
function sharePhrase(percent: number): string {
  if (percent >= 40) return '将近一半'
  if (percent >= 28) return '三分之一'
  if (percent >= 18) return '五分之一'
  return `${percent}%`
}

export function RecapHourPanel({
  buckets,
  cardTotal
}: {
  buckets: HourBucket[]
  /** 时段内的卡片总数，即各行数字之和。 */
  cardTotal: number
}): JSX.Element {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1)
  const top = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best))
  const percent = cardTotal > 0 ? Math.round((top.count / cardTotal) * 100) : 0

  return (
    <Panel className="flex min-w-0 flex-[1_1_340px] flex-col p-[18px]">
      <PanelHeader label="常用时段" aside={`${cardTotal} 张卡片`} />

      <div className="flex flex-col gap-2.5">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-2.5">
            <span className="w-[54px] shrink-0 font-display text-[11.5px] text-ink">
              {bucket.label}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-paper-selected">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(bucket.count / max) * 100}%`,
                  backgroundColor: 'var(--color-terra)'
                }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-[11.5px] tabular-nums text-ink">
              {bucket.count}
            </span>
          </div>
        ))}
      </div>

      <div className={PANEL_FOOT}>
        {cardTotal > 0
          ? `${HOUR_NAMES[top.label] ?? top.label}写得最多，占了${sharePhrase(percent)}。`
          : '这个范围还没有卡片。'}
      </div>
    </Panel>
  )
}

/* ── 空态 ───────────────────────────────────────────────────── */

export function RecapEmptyPanel({
  periodName,
  onWrite
}: {
  periodName: string
  onWrite: () => void
}): JSX.Element {
  return (
    <Panel
      tone="dashed"
      className="flex min-w-0 flex-[4_1_640px] flex-col justify-center gap-3 p-[18px]"
    >
      <div className="flex items-center gap-2">
        <CalendarDays size={15} className="text-ink-soft" />
        <span className="font-display text-[22px] font-semibold text-ink-strong">
          {periodName}还没有记录
        </span>
      </div>
      <p className="m-0 font-serif text-[13.5px] leading-[1.85] text-ink">
        写下第一页，之后的天数、心情曲线、热度图和照片墙都会从这里长出来。
      </p>
      <div>
        <JournalButton tone="primary" onClick={onWrite}>
          <PenLine size={14} />
          写一页
        </JournalButton>
      </div>
    </Panel>
  )
}
