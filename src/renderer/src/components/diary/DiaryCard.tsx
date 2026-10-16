import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Edit3, Trash2 } from 'lucide-react'
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
  onDelete?: (entry: DiaryEntry) => void
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
  onDelete,
  onEdit
}: DiaryCardProps): JSX.Element {
  const preview = stripHtml(entry.content).slice(0, 80)
  const timeStr = format(new Date(entry.createdAt), 'HH:mm', { locale: zhCN })

  return (
    <div
      className={cn(
        'group relative rounded-lg transition-colors duration-150',
        isActive
          ? 'bg-accent/10 dark:bg-accent/15'
          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      )}
    >
      {/* Main open button */}
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="block h-auto w-full justify-start rounded-lg p-2.5 pr-8 text-left
                   text-text-primary-light dark:text-text-primary-dark"
      >
        <h3 className="truncate font-serif text-[13px] font-medium leading-5 text-text-primary-light dark:text-text-primary-dark">
          {entry.title || '无标题'}
        </h3>
        {preview && (
          <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-text-secondary-light dark:text-text-secondary-dark">
            {preview}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-4 text-text-secondary-light dark:text-text-secondary-dark">
          <span>{timeStr}</span>
          {entry.mood && MOOD_EMOJIS[entry.mood] && (
            <span title={entry.mood}>{MOOD_EMOJIS[entry.mood]}</span>
          )}
          {entry.weather && WEATHER_ICONS[entry.weather] && (
            <span title={entry.weather}>{WEATHER_ICONS[entry.weather]}</span>
          )}
          <span className="ml-auto">{entry.wordCount} 字</span>
        </div>
      </Button>

      {/* Quick actions — overlay right side, revealed on hover / focus. Sibling of the
          open button so there are no nested interactive elements. */}
      <div
        className={cn(
          'absolute right-1 top-1 z-10 flex items-center gap-0.5 transition-opacity',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(): void => onEdit?.(entry)}
          title="编辑"
          aria-label="编辑"
          className="h-6 w-6 text-text-secondary-light hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
        >
          <Edit3 size={13} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(): void => onDelete?.(entry)}
          title="删除"
          aria-label="删除"
          className="h-6 w-6 text-text-secondary-light hover:bg-red-500/10 hover:text-red-500 dark:text-text-secondary-dark dark:hover:text-red-400"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  )
}
