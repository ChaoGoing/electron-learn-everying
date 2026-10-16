import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Edit3,
  Heart,
  Sun,
  Trash2,
  Wind
} from 'lucide-react'
import { Button } from '../../components/ui/button'
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

const MOOD_LABELS: Record<string, string> = {
  happy: '开心',
  excited: '兴奋',
  grateful: '感恩',
  neutral: '平静',
  tired: '疲惫',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气'
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '雨',
  snowy: '雪',
  windy: '风',
  stormy: '雷暴',
  foggy: '雾'
}

const WEATHER_ICONS: Record<string, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
  stormy: CloudLightning,
  foggy: CloudFog
}

function MetaChip({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface-elevated-light px-2.5 py-1 text-xs text-text-secondary-light dark:border-border-dark dark:bg-surface-elevated-dark dark:text-text-secondary-dark">
      {children}
    </span>
  )
}

export default function DiaryDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    window.api.diary
      .get(id)
      .then((data) => {
        setEntry(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">加载中...</p>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          日记不存在
        </p>
      </div>
    )
  }

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm('确定要删除这篇日记吗？')) return
    await window.api.diary.delete(entry.id)
    navigate('/diary')
  }

  const handleToggleFavorite = async (): Promise<void> => {
    const updated = await window.api.diary.update(entry.id, { isFavorite: !entry.isFavorite })
    if (updated) setEntry(updated)
  }

  const dateStr = format(new Date(entry.createdAt), 'yyyy年M月d日 · EEEE HH:mm', { locale: zhCN })
  const edited = new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime() > 60_000

  const moodLabel = entry.mood ? MOOD_LABELS[entry.mood] : null
  const moodEmoji = entry.mood ? MOOD_EMOJIS[entry.mood] : null
  const WeatherIcon = entry.weather ? WEATHER_ICONS[entry.weather] : null
  const weatherLabel = entry.weather ? WEATHER_LABELS[entry.weather] : null

  return (
    <div className="journal-paper flex h-full flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light shadow-card dark:border-border-dark dark:bg-surface-dark dark:shadow-card-dark">
      {/* Card header — context meta on the left, quiet actions on the right */}
      <header className="flex items-center justify-between gap-3 border-b border-border-light px-6 py-3 dark:border-border-dark">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-xs text-text-secondary-light dark:text-text-secondary-dark">
            {dateStr}
          </span>
          {moodLabel && moodEmoji && (
            <MetaChip>
              <span>{moodEmoji}</span>
              <span>{moodLabel}</span>
            </MetaChip>
          )}
          {WeatherIcon && weatherLabel && (
            <MetaChip>
              <WeatherIcon size={13} />
              <span>{weatherLabel}</span>
            </MetaChip>
          )}
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(): void => void handleToggleFavorite()}
            className={cn(
              'h-7 w-7 rounded-md text-text-secondary-light hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark',
              entry.isFavorite && 'text-red-400 hover:text-red-400 dark:text-red-400'
            )}
            title={entry.isFavorite ? '取消收藏' : '收藏'}
            aria-label={entry.isFavorite ? '取消收藏' : '收藏'}
          >
            <Heart size={15} className={entry.isFavorite ? 'fill-red-400' : ''} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(): void => {
              navigate(`/diary/${entry.id}/edit`)
            }}
            className="h-7 w-7 rounded-md text-text-secondary-light hover:text-accent dark:text-text-secondary-dark dark:hover:text-accent"
            title="编辑"
            aria-label="编辑"
          >
            <Edit3 size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(): void => void handleDelete()}
            className="h-7 w-7 rounded-md text-text-secondary-light hover:bg-red-500/10 hover:text-red-500 dark:text-text-secondary-dark dark:hover:text-red-400"
            title="删除"
            aria-label="删除"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </header>

      {/* Scrollable reading body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col px-8 pb-10 pt-7">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-text-primary-light dark:text-text-primary-dark">
            {entry.title || '无标题'}
          </h1>

          <div
            className="prose prose-base mt-5 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        </div>
      </div>

      {/* Card footer — quiet meta, mirrors the editor footer */}
      <footer className="flex items-center justify-between border-t border-border-light px-6 py-2.5 dark:border-border-dark">
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {edited ? '更新于 ' : '写于 '}
          {format(new Date(edited ? entry.updatedAt : entry.createdAt), 'M月d日 HH:mm', {
            locale: zhCN
          })}
        </span>
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {entry.wordCount} 字
        </span>
      </footer>
    </div>
  )
}
