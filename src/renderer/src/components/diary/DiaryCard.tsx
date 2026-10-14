import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Edit3, Heart } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import type { DiaryEntry } from '../../../../shared/types/diary'

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  grateful: '🙏',
  neutral: '😐',
  tired: '😴',
  sad: '😢',
  anxious: '😰',
  angry: '😤'
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  windy: '💨',
  stormy: '⛈️',
  foggy: '🌫️'
}

interface DiaryCardProps {
  entry: DiaryEntry
  isActive?: boolean
  onClick: () => void
  onToggleFavorite?: (entry: DiaryEntry) => void
  onEdit?: (entry: DiaryEntry) => void
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export function DiaryCard({
  entry,
  isActive,
  onClick,
  onToggleFavorite,
  onEdit
}: DiaryCardProps): JSX.Element {
  const preview = stripHtml(entry.content).slice(0, 100)
  const timeStr = format(new Date(entry.createdAt), 'HH:mm', { locale: zhCN })

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200',
        'hover:shadow-card dark:hover:shadow-card-dark',
        isActive
          ? 'border-accent/30 bg-accent/5 shadow-card dark:shadow-card-dark'
          : 'border-transparent hover:bg-surface-light dark:hover:bg-surface-dark'
      )}
    >
      {/* Active indicator: left accent bar */}
      {isActive && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent"
          aria-hidden="true"
        />
      )}

      {/* Main open button */}
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="block w-full justify-start h-auto rounded-none p-3 text-left
                   text-text-primary-light dark:text-text-primary-dark"
      >
        <div className="w-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                {entry.title || '无标题'}
              </h3>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5 line-clamp-2">
                {preview || '空内容'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              {timeStr}
            </span>
            {entry.mood && MOOD_EMOJIS[entry.mood] && (
              <span className="text-xs" title={entry.mood}>
                {MOOD_EMOJIS[entry.mood]}
              </span>
            )}
            {entry.weather && WEATHER_ICONS[entry.weather] && (
              <span className="text-xs" title={entry.weather}>
                {WEATHER_ICONS[entry.weather]}
              </span>
            )}
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-auto">
              {entry.wordCount} 字
            </span>
          </div>
        </div>
      </Button>

      {/* Quick actions — overlay top-right, revealed on hover / focus. Sibling of the
          open button so there are no nested interactive elements. */}
      <div
        className={cn(
          'absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-lg p-0.5 transition-opacity',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          'group-hover:bg-black/[0.04] group-hover:backdrop-blur-sm dark:group-hover:bg-white/10',
          'group-focus-within:bg-black/[0.04] group-focus-within:backdrop-blur-sm dark:group-focus-within:bg-white/10',
          entry.isFavorite ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(): void => onToggleFavorite?.(entry)}
          title={entry.isFavorite ? '取消收藏' : '收藏'}
          aria-label={entry.isFavorite ? '取消收藏' : '收藏'}
          className="w-7 h-7"
        >
          <Heart
            size={14}
            className={cn(
              'transition-colors',
              entry.isFavorite
                ? 'text-red-400 fill-red-400'
                : 'text-text-secondary-light dark:text-text-secondary-dark'
            )}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(): void => onEdit?.(entry)}
          title="编辑"
          aria-label="编辑"
          className="w-7 h-7 text-text-secondary-light dark:text-text-secondary-dark"
        >
          <Edit3 size={14} />
        </Button>
      </div>
    </div>
  )
}
