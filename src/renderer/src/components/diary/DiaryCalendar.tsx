import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

interface DiaryCalendarProps {
  year: number
  month: number
  selectedDate: string | null
  datesWithEntries: string[]
  onDateSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function DiaryCalendar({
  year,
  month,
  selectedDate,
  datesWithEntries,
  onDateSelect,
  onMonthChange,
}: DiaryCalendarProps): JSX.Element {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const goToPrevMonth = (): void => {
    const prev = new Date(year, month - 1, 1)
    onMonthChange(prev.getFullYear(), prev.getMonth())
  }
  const goToNextMonth = (): void => {
    const next = new Date(year, month + 1, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }
  const goToToday = (): void => {
    onDateSelect(todayStr)
    onMonthChange(today.getFullYear(), today.getMonth())
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToPrevMonth} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          {monthNames[month]} {year}
        </span>
        <button onClick={goToNextMonth} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />

          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          const hasEntry = datesWithEntries.includes(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(dateStr)}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative',
                'hover:bg-black/5 dark:hover:bg-white/10',
                isSelected && 'bg-accent text-white hover:bg-accent-hover',
                isToday && !isSelected && 'text-accent font-semibold',
                !isSelected && 'text-text-primary-light dark:text-text-primary-dark'
              )}
            >
              {day}
              {hasEntry && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Today button */}
      <button
        onClick={goToToday}
        className="mt-3 w-full text-xs text-accent hover:text-accent-hover transition-colors py-1"
      >
        回到今天
      </button>
    </div>
  )
}