/**
 * 日历：按月的返回视图。
 *
 * 左边是月历（沿用已有的 `DiaryCalendar`，有记录的日期带圆点），右边是这个月
 * 已写下的每一天，点进去就是那一天的阅读页。
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { DiaryCalendar } from '../../components/diary/DiaryCalendar'
import { JournalToolbar } from '../../components/diary/JournalToolbar'
import { Chip, Panel, PanelHeader } from '../../components/diary/JournalPrimitives'
import { useDiaryStore } from '../../stores/diaryStore'
import { MOOD_EMOJIS, MOOD_LABELS, WEATHER_LABELS } from '../../lib/diaryCards'
import { WEATHER_ICONS } from '../../lib/diaryMeta'
import { buildDayStats, monthEntries, pageForDate } from '../../lib/diaryStats'

export default function DiaryCalendarPage(): JSX.Element {
  const navigate = useNavigate()

  const entries = useDiaryStore((state) => state.entries)
  const year = useDiaryStore((state) => state.year)
  const month = useDiaryStore((state) => state.month)
  const selectedDate = useDiaryStore((state) => state.selectedDate)
  const selectDate = useDiaryStore((state) => state.selectDate)
  const setMonth = useDiaryStore((state) => state.setMonth)
  const createPage = useDiaryStore((state) => state.createPage)

  const datesWithEntries = useMemo(
    () => Array.from(buildDayStats(entries).keys()).sort(),
    [entries]
  )

  const monthPages = useMemo(() => {
    return monthEntries(entries, year, month)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [entries, year, month])

  const open = (date: string): void => {
    const page = pageForDate(entries, date)
    if (page) {
      navigate(`/diary/${page.id}`)
      return
    }
    void createPage(date).then((created): void => {
      if (created) navigate(`/diary/${created.id}/edit`)
    })
  }

  return (
    <>
      <JournalToolbar view="calendar" />

      <main className="min-h-0 flex-1 overflow-y-auto px-[26px] pb-[30px] pt-[22px]">
        <div className="flex flex-wrap items-start gap-4">
          <Panel tone="warm" className="flex min-w-0 flex-[1_1_320px] flex-col p-[18px]">
            <PanelHeader label="月历" aside={`${year} 年 ${month + 1} 月`} />
            <DiaryCalendar
              year={year}
              month={month}
              selectedDate={selectedDate}
              datesWithEntries={datesWithEntries}
              onDateSelect={(date): void => {
                selectDate(date)
                open(date)
              }}
              onMonthChange={setMonth}
            />
          </Panel>

          <Panel className="flex min-w-0 flex-[2_1_520px] flex-col p-[18px]">
            <PanelHeader label="这个月写下的" aside={`${monthPages.length} 天`} />
            <div className="flex flex-col gap-1">
              {monthPages.map((entry) => {
                const parsed = new Date(entry.createdAt)
                const WeatherIcon = entry.weather ? WEATHER_ICONS[entry.weather] : null
                const place =
                  entry.location ??
                  entry.cards.reduce<string | null>((found, card) => {
                    if (found) return found
                    if (card.type === 'photo' || card.type === 'location') return card.place
                    return null
                  }, null)

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={(): void => {
                      navigate(`/diary/${entry.id}`)
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-paper-sunken"
                  >
                    <span className="w-11 shrink-0 text-center">
                      <span className="block font-display text-[19px] font-semibold leading-none text-ink-strong">
                        {parsed.getDate()}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-ink-soft">
                        {parsed.getMonth() + 1}月
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-ink-strong">
                        {entry.cards[0]?.title || '（空页面）'}
                        {entry.cards.length > 1 ? ` 等 ${entry.cards.length} 张卡片` : ''}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-ink-soft">
                        <span>{entry.wordCount} 字</span>
                        {entry.mood ? (
                          <span>
                            {MOOD_EMOJIS[entry.mood]} {MOOD_LABELS[entry.mood] ?? entry.mood}
                          </span>
                        ) : null}
                        {WeatherIcon && entry.weather ? (
                          <span className="inline-flex items-center gap-1">
                            <WeatherIcon size={11} />
                            {WEATHER_LABELS[entry.weather]}
                          </span>
                        ) : null}
                        {place ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} />
                            {place}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <ChevronRight size={15} className="shrink-0 text-ink-faint" />
                  </button>
                )
              })}

              {monthPages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <p className="m-0 text-sm text-ink">这个月还没有记录。</p>
                  <Chip tone="terra">点左边的任意一天开始写</Chip>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      </main>
    </>
  )
}
