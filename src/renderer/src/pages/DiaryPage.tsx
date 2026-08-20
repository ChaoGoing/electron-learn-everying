import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, Outlet, useLocation } from 'react-router-dom'
import { DiaryCalendar } from '../components/diary/DiaryCalendar'
import { DiaryList } from '../components/diary/DiaryList'
import type { DiaryEntry } from '../../../shared/types/diary'

export default function DiaryPage(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [datesWithEntries, setDatesWithEntries] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const isEditing = location.pathname.includes('/edit')
  const isDetail = !!id && !isEditing

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const filters = selectedDate ? { date: selectedDate } : {}
      const result = await window.api.diary.list(filters)
      setEntries(result)
    } catch (err) {
      console.error('Failed to load diary entries:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const loadDatesWithEntries = useCallback(async () => {
    try {
      const dates = await window.api.diary.getDates(year, month + 1)
      setDatesWithEntries(dates)
    } catch (err) {
      console.error('Failed to load dates:', err)
    }
  }, [year, month])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    loadDatesWithEntries()
  }, [loadDatesWithEntries])

  const handleNewEntry = async (): Promise<void> => {
    try {
      const entry = await window.api.diary.create({
        title: '',
        content: '',
        mood: null,
        weather: null,
      })
      navigate(`/diary/${entry.id}/edit`)
    } catch (err) {
      console.error('Failed to create entry:', err)
    }
  }

  const handleSelectEntry = (entry: DiaryEntry): void => {
    navigate(`/diary/${entry.id}`)
  }

  const handleDeleteEntry = async (entryId: string): Promise<void> => {
    try {
      await window.api.diary.delete(entryId)
      if (id === entryId) navigate('/diary')
      loadEntries()
      loadDatesWithEntries()
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }

  // Show detail/edit page if an ID is in the URL
  if (isDetail || isEditing) {
    return (
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r border-border-light dark:border-border-dark flex flex-col shrink-0">
          <div className="p-3">
            <DiaryCalendar
              year={year}
              month={month}
              selectedDate={selectedDate}
              datesWithEntries={datesWithEntries}
              onDateSelect={setSelectedDate}
              onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
            />
          </div>
          <DiaryList
            entries={entries}
            selectedId={id || null}
            onSelect={handleSelectEntry}
            onNewEntry={handleNewEntry}
          />
        </div>
        {/* Content */}
        <div className="flex-1">
          <Outlet context={{ entries, onDelete: handleDeleteEntry, onSave: loadEntries }} />
        </div>
      </div>
    )
  }

  // Default view: sidebar + empty state
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border-light dark:border-border-dark flex flex-col shrink-0">
        <div className="p-3">
          <DiaryCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            datesWithEntries={datesWithEntries}
            onDateSelect={setSelectedDate}
            onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
          />
        </div>
        <DiaryList
          entries={entries}
          selectedId={null}
          onSelect={handleSelectEntry}
          onNewEntry={handleNewEntry}
        />
      </div>
      {/* Empty state */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm">
            {loading ? '加载中...' : '选择一篇日记或点击 + 写新日记'}
          </p>
        </div>
      </div>
    </div>
  )
}