import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ArrowLeft,
  ChevronDown,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind
} from 'lucide-react'
import { DiaryEditor } from '../../components/diary/DiaryEditor'
import { MoodPicker } from '../../components/diary/MoodPicker'
import { WeatherPicker } from '../../components/diary/WeatherPicker'
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

interface ContextPopoverProps {
  open: boolean
  onToggle: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
}

function ContextPopover({ open, onToggle, trigger, children }: ContextPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return (): void => document.removeEventListener('mousedown', onPointerDown)
  }, [open, onToggle])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(): void => onToggle(!open)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
          'text-text-secondary-light dark:text-text-secondary-dark',
          'border-transparent hover:border-border-light hover:bg-black/5 dark:hover:bg-white/5',
          open && 'border-accent/40 bg-accent/10 text-accent'
        )}
      >
        {trigger}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 rounded-xl border border-border-light bg-surface-light p-2 shadow-elevated dark:border-border-dark dark:bg-surface-dark dark:shadow-elevated-dark">
          {children}
        </div>
      )}
    </div>
  )
}

export default function DiaryEditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [weather, setWeather] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [moodOpen, setMoodOpen] = useState(false)
  const [weatherOpen, setWeatherOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    window.api.diary
      .get(id)
      .then((data): void => {
        setEntry(data)
        setMood(data?.mood || null)
        setWeather(data?.weather || null)
        setLoading(false)
      })
      .catch((): void => setLoading(false))
  }, [id])

  const handleMoodChange = async (newMood: string | null): Promise<void> => {
    setMood(newMood)
    setMoodOpen(false)
    if (entry) {
      await window.api.diary.update(entry.id, { mood: newMood })
    }
  }

  const handleWeatherChange = async (newWeather: string | null): Promise<void> => {
    setWeather(newWeather)
    setWeatherOpen(false)
    if (entry) {
      await window.api.diary.update(entry.id, { weather: newWeather })
    }
  }

  const handleSave = (savedEntry: DiaryEntry): void => {
    setEntry(savedEntry)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">加载中...</p>
      </div>
    )
  }

  const dateStr = entry?.createdAt
    ? format(new Date(entry.createdAt), 'yyyy年M月d日 · EEEE', { locale: zhCN })
    : null

  const moodEmoji = mood ? MOOD_EMOJIS[mood] || '🙂' : '🙂'
  const moodLabel = mood ? MOOD_LABELS[mood] || '心情' : '心情'
  const WeatherIcon = weather ? WEATHER_ICONS[weather] || Cloud : Cloud
  const weatherLabel = weather ? WEATHER_LABELS[weather] || '天气' : '天气'

  return (
    <div className="flex h-full flex-col">
      {/* Top bar — minimal */}
      <div className="flex items-center gap-3 border-b border-border-light px-6 py-2.5 dark:border-border-dark">
        <button
          type="button"
          onClick={(): void => {
            navigate(entry ? `/diary/${entry.id}` : '/diary')
          }}
          className="flex items-center gap-1 text-sm text-text-secondary-light transition-colors
                     hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {entry?.id ? '编辑日记' : '新日记'} · 自动保存
        </span>
      </div>

      {/* Writing surface — quiet gray mica backdrop */}
      <div className="flex-1 overflow-y-auto bg-mica-light dark:bg-mica-dark">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-8 py-8">
          {/* Ambient context strip: date + mood + weather */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {dateStr && (
              <span className="mr-1 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                {dateStr}
              </span>
            )}
            <ContextPopover
              open={moodOpen}
              onToggle={setMoodOpen}
              trigger={
                <>
                  <span>{moodEmoji}</span>
                  <span>{moodLabel}</span>
                </>
              }
            >
              <MoodPicker value={mood} onChange={handleMoodChange} />
            </ContextPopover>
            <ContextPopover
              open={weatherOpen}
              onToggle={setWeatherOpen}
              trigger={
                <>
                  <WeatherIcon size={15} />
                  <span>{weatherLabel}</span>
                </>
              }
            >
              <WeatherPicker value={weather} onChange={handleWeatherChange} />
            </ContextPopover>
          </div>

          {/* Paper panel */}
          <div className="journal-paper flex flex-1 flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light shadow-card dark:border-border-dark dark:bg-surface-dark dark:shadow-card-dark">
            <DiaryEditor entry={entry} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  )
}
