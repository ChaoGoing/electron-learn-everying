import { Button } from '../ui/button'
import { Calendar } from '../ui/calendar'

interface DiaryCalendarProps {
  year: number
  month: number
  selectedDate: string | null
  datesWithEntries: string[]
  onDateSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** Format a Date as a local `YYYY-MM-DD` string (matches the diary API). */
function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse a `YYYY-MM-DD` string into a local Date. */
function fromDateString(value: string | null): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function DiaryCalendar({
  year,
  month,
  selectedDate,
  datesWithEntries,
  onDateSelect,
  onMonthChange
}: DiaryCalendarProps): JSX.Element {
  const today = new Date()
  const todayStr = toDateString(today)
  const selected = fromDateString(selectedDate)
  const entriesSet = new Set(datesWithEntries)

  const goToToday = (): void => {
    onDateSelect(todayStr)
    onMonthChange(today.getFullYear(), today.getMonth())
  }

  return (
    <div className="select-none">
      <Calendar
        mode="single"
        month={new Date(year, month, 1)}
        selected={selected}
        onSelect={(date) => {
          if (date) onDateSelect(toDateString(date))
        }}
        onMonthChange={(nextMonth) => onMonthChange(nextMonth.getFullYear(), nextMonth.getMonth())}
        showOutsideDays={false}
        // 与卡片板的迷你月历、回顾页的热度图保持一致：周一为一周首日。
        weekStartsOn={1}
        classNames={{ root: 'w-full' }}
        formatters={{
          formatCaption: (monthDate) =>
            `${monthDate.getFullYear()} · ${monthDate.getMonth() + 1}月`,
          formatWeekdayName: (weekday) => WEEKDAYS[weekday.getDay()]
        }}
        labels={{
          labelPrevious: () => '上个月',
          labelNext: () => '下个月'
        }}
        modifiers={{
          hasEntry: (date) => entriesSet.has(toDateString(date))
        }}
      />

      <Button
        variant="link"
        onClick={goToToday}
        className="mt-3 w-full py-1 text-xs hover:text-accent-hover"
      >
        回到今天
      </Button>
    </div>
  )
}
