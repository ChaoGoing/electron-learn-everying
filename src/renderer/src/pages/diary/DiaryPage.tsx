import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, Outlet, useLocation } from 'react-router-dom'
import { PenLine, Plus } from 'lucide-react'
import { DiaryCalendar } from '../../components/diary/DiaryCalendar'
import { DiaryList } from '../../components/diary/DiaryList'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/cn'
import type { DiaryEntry } from '../../../../shared/types/diary'

/** Shared Windows-11 card chrome for the three diary panels. */
const CARD_CLASS = cn(
  'rounded-2xl border border-border-light bg-surface-light shadow-card',
  'dark:border-border-dark dark:bg-surface-dark dark:shadow-card-dark'
)

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
  const showEntry = isDetail || isEditing

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
        weather: null
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

  const handleSynced = (): void => {
    loadEntries()
    loadDatesWithEntries()
  }

  const handleDeleteFromList = (entry: DiaryEntry): void => {
    if (!window.confirm('确定要删除这篇日记吗？')) return
    void handleDeleteEntry(entry.id)
  }

  const handleEditEntry = (entry: DiaryEntry): void => {
    navigate(`/diary/${entry.id}/edit`)
  }

  const calendar = (
    <DiaryCalendar
      year={year}
      month={month}
      selectedDate={selectedDate}
      datesWithEntries={datesWithEntries}
      onDateSelect={setSelectedDate}
      onMonthChange={(y, m) => {
        setYear(y)
        setMonth(m)
      }}
    />
  )

  const list = (
    <DiaryList
      entries={entries}
      selectedId={showEntry ? id || null : null}
      onSelect={handleSelectEntry}
      onNewEntry={handleNewEntry}
      onDelete={handleDeleteFromList}
      onEdit={handleEditEntry}
      onSynced={handleSynced}
    />
  )

  return (
    <div className="flex h-full gap-3 p-3">
      {/* Left rail — compact stack: calendar card + list card */}
      <div className="flex w-[248px] shrink-0 flex-col gap-3">
        <div className={cn(CARD_CLASS, 'shrink-0 p-3')}>{calendar}</div>
        <div className={cn(CARD_CLASS, 'min-h-0 flex-1 overflow-hidden')}>{list}</div>
      </div>

      {/* Reading / editing card (or empty state) */}
      <div className="min-w-0 flex-1">
        {showEntry ? (
          <Outlet context={{ entries, onDelete: handleDeleteEntry, onSave: loadEntries }} />
        ) : (
          <div
            className={cn(
              CARD_CLASS,
              'journal-paper flex h-full flex-col items-center justify-center gap-4 text-center'
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <PenLine size={22} />
            </div>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {loading ? '加载中...' : '选择一篇日记，或写一篇新的'}
            </p>
            {!loading && (
              <Button onClick={handleNewEntry} className="mt-1 gap-1.5 rounded-md">
                <Plus size={15} />
                写日记
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
