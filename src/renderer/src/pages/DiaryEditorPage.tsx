import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DiaryEditor } from '../components/diary/DiaryEditor'
import { MoodPicker } from '../components/diary/MoodPicker'
import { WeatherPicker } from '../components/diary/WeatherPicker'
import type { DiaryEntry } from '../../../shared/types/diary'

export default function DiaryEditorPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [weather, setWeather] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    window.api.diary.get(id).then((data) => {
      setEntry(data)
      setMood(data?.mood || null)
      setWeather(data?.weather || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleMoodChange = async (newMood: string | null): Promise<void> => {
    setMood(newMood)
    if (entry) {
      await window.api.diary.update(entry.id, { mood: newMood })
    }
  }

  const handleWeatherChange = async (newWeather: string | null): Promise<void> => {
    setWeather(newWeather)
    if (entry) {
      await window.api.diary.update(entry.id, { weather: newWeather })
    }
  }

  const handleSave = (savedEntry: DiaryEntry): void => {
    setEntry(savedEntry)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">加载中...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => navigate(entry ? `/diary/${entry.id}` : '/diary')}
          className="flex items-center gap-1 text-sm text-text-secondary-light dark:text-text-secondary-dark
                     hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {entry?.id ? '编辑日记' : '新日记'} · 自动保存
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <DiaryEditor entry={entry} onSave={handleSave} />
      </div>

      {/* Bottom bar: mood & weather pickers */}
      <div className="flex items-center gap-4 px-6 py-2 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">心情</span>
          <MoodPicker value={mood} onChange={handleMoodChange} />
        </div>
        <div className="w-px h-6 bg-border-light dark:bg-border-dark" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">天气</span>
          <WeatherPicker value={weather} onChange={handleWeatherChange} />
        </div>
      </div>
    </div>
  )
}