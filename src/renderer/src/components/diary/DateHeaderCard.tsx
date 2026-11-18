/**
 * 日期卡：卡片板的第一块 —— 年份 / 日期 / 星期 + 天气、地点、本月第几页 + 一行摘要。
 * 右侧是「编排模式」入口。
 */
import { LayoutGrid, MapPin } from 'lucide-react'
import { WEATHER_ICONS } from '../../lib/diaryMeta'
import { WEATHER_LABELS } from '../../lib/diaryCards'
import { fromDateKey, weekdayLabel } from '../../lib/diaryStats'
import { Chip, JournalButton } from './JournalPrimitives'
import type { DiaryEntry } from '../../../../shared/types/diary'

export interface DateHeaderCardProps {
  date: string
  /** 这一天的那一页；还没写则为 null。 */
  page: DiaryEntry | null
  /** 该日在本月已写下的日子里的序号；没写过为 null。 */
  pageIndexInMonth: number | null
  /** 本月已写下的天数（该日还没写时用它）。 */
  monthWrittenDays: number
  onCompose: () => void
}

export function DateHeaderCard({
  date,
  page,
  pageIndexInMonth,
  monthWrittenDays,
  onCompose
}: DateHeaderCardProps): JSX.Element {
  const parsed = fromDateKey(date)
  const year = parsed.getFullYear()
  const month = parsed.getMonth() + 1
  const day = parsed.getDate()

  const weatherCard = page?.cards.find((card) => card.type === 'weather')
  const weather =
    weatherCard && weatherCard.type === 'weather' ? weatherCard.weather : page?.weather
  const temperature = weatherCard && weatherCard.type === 'weather' ? weatherCard.temperature : null
  const WeatherIcon = weather ? WEATHER_ICONS[weather] : null

  const location =
    page?.location ??
    page?.cards.reduce<string | null>((found, card) => {
      if (found) return found
      if (card.type === 'location') return card.place
      if (card.type === 'photo' || card.type === 'weather') return card.place
      return null
    }, null)

  const summary =
    page && page.cards.length > 0
      ? `今天放了 ${page.cards.length} 张卡片，${page.wordCount} 个字。`
      : '这一天还是空白的。'

  return (
    <section className="flex min-w-0 flex-[2_1_460px] flex-col rounded-2xl border border-paper-line-strong bg-paper-card-warm p-[18px] shadow-card">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-baseline gap-[11px]">
          <span className="font-display text-sm tracking-[0.1em] text-ink-soft">{year}</span>
          <h1 className="m-0 font-display text-[34px] font-semibold leading-none tracking-[0.02em] text-ink-strong">
            {month}月{day}日
          </h1>
          <span className="text-[13px] text-ink">{weekdayLabel(date)}</span>
        </div>
        <JournalButton onClick={onCompose} className="ml-auto">
          <LayoutGrid size={14} />
          编排模式
        </JournalButton>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {WeatherIcon ? (
          <Chip tone="terra">
            <WeatherIcon size={13} />
            {weather ? WEATHER_LABELS[weather] : '天气'}
            {temperature !== null ? ` ${temperature}°` : ''}
          </Chip>
        ) : null}
        {location ? (
          <Chip tone="sand">
            <MapPin size={12} />
            {location}
          </Chip>
        ) : null}
        <Chip tone="moss">
          {pageIndexInMonth === null
            ? `本月已写 ${monthWrittenDays} 天`
            : `本月第 ${pageIndexInMonth} 页`}
        </Chip>
      </div>

      <p className="m-0 mt-auto pt-3.5 font-serif text-[13.5px] leading-[1.85] text-ink">
        {summary}
      </p>
    </section>
  )
}
