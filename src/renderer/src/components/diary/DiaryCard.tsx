import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Heart } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DiaryEntry } from '../../../../shared/types/diary'

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', excited: '🤩', grateful: '🙏', neutral: '😐',
  tired: '😴', sad: '😢', anxious: '😰', angry: '😤',
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '❄️',
  windy: '💨', stormy: '⛈️', foggy: '🌫️',
}

interface DiaryCardProps {
  entry: DiaryEntry
  isActive?: boolean
  onClick: () => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function DiaryCard({ entry, isActive, onClick }: DiaryCardProps): JSX.Element {
  const preview = stripHtml(entry.content).slice(0, 100)
  const timeStr = format(new Date(entry.createdAt), 'HH:mm', { locale: zhCN })

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl transition-all duration-200 border',
        'hover:shadow-card dark:hover:shadow-card-dark',
        isActive
          ? 'border-accent/30 bg-accent/5 shadow-card dark:shadow-card-dark'
          : 'border-transparent hover:bg-surface-light dark:hover:bg-surface-dark'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
            {entry.title || '无标题'}
          </h3>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5 line-clamp-2">
            {preview || '空内容'}
          </p>
        </div>
        {entry.isFavorite && (
          <Heart size={14} className="text-red-400 fill-red-400 shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {timeStr}
        </span>
        {entry.mood && MOOD_EMOJIS[entry.mood] && (
          <span className="text-xs" title={entry.mood}>{MOOD_EMOJIS[entry.mood]}</span>
        )}
        {entry.weather && WEATHER_ICONS[entry.weather] && (
          <span className="text-xs" title={entry.weather}>{WEATHER_ICONS[entry.weather]}</span>
        )}
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
          {entry.wordCount} 字
        </span>
      </div>
    </button>
  )
}