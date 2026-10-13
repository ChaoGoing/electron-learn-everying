import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowLeft, Edit3, Trash2, Heart } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DiaryEntry } from '../../../../shared/types/diary'

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', excited: '🤩', grateful: '🙏', neutral: '😐',
  tired: '😴', sad: '😢', anxious: '😰', angry: '😤',
}

const MOOD_LABELS: Record<string, string> = {
  happy: '开心', excited: '兴奋', grateful: '感恩', neutral: '平静',
  tired: '疲惫', sad: '难过', anxious: '焦虑', angry: '生气',
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: '晴', cloudy: '多云', rainy: '雨', snowy: '雪',
  windy: '风', stormy: '雷暴', foggy: '雾',
}

export default function DiaryDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    window.api.diary.get(id).then((data) => {
      setEntry(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">加载中...</p>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">日记不存在</p>
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

  const dateStr = format(new Date(entry.createdAt), 'yyyy年M月d日 EEEE HH:mm', { locale: zhCN })

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-mica-light/80 dark:bg-mica-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => navigate('/diary')}
          className="flex items-center gap-1 text-sm text-text-secondary-light dark:text-text-secondary-dark
                     hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleFavorite}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              entry.isFavorite && 'text-red-400'
            )}
            title={entry.isFavorite ? '取消收藏' : '收藏'}
          >
            <Heart size={16} className={entry.isFavorite ? 'fill-red-400' : ''} />
          </button>
          <button
            onClick={() => navigate(`/diary/${entry.id}/edit`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="编辑"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark mb-2">
          {entry.title || '无标题'}
        </h1>

        <div className="flex items-center gap-3 mb-6 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          <span>{dateStr}</span>
          {entry.mood && MOOD_LABELS[entry.mood] && (
            <span className="flex items-center gap-1">
              {MOOD_EMOJIS[entry.mood]} {MOOD_LABELS[entry.mood]}
            </span>
          )}
          {entry.weather && WEATHER_LABELS[entry.weather] && (
            <span>{WEATHER_LABELS[entry.weather]}</span>
          )}
          <span>{entry.wordCount} 字</span>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      </div>
    </div>
  )
}