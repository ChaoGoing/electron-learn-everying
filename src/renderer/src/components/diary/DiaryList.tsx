import { Plus } from 'lucide-react'
import { DiaryCard } from './DiaryCard'
import { SyncToolbar } from './SyncToolbar'
import type { DiaryEntry } from '../../../../shared/types/diary'

interface DiaryListProps {
  entries: DiaryEntry[]
  selectedId: string | null
  onSelect: (entry: DiaryEntry) => void
  onNewEntry: () => void
  onSynced?: () => void
}

export function DiaryList({
  entries,
  selectedId,
  onSelect,
  onNewEntry,
  onSynced
}: DiaryListProps): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
        <h2 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          {entries.length === 0 ? '日记列表' : `${entries.length} 篇日记`}
        </h2>
        <button
          onClick={onNewEntry}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-white
                     hover:bg-accent-hover transition-colors"
          title="写日记"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Sync controls */}
      <SyncToolbar onSynced={onSynced} />

      {/* List */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
            <p className="text-sm">暂无日记</p>
            <button
              onClick={onNewEntry}
              className="mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              写一篇日记
            </button>
          </div>
        ) : (
          entries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              isActive={entry.id === selectedId}
              onClick={() => onSelect(entry)}
            />
          ))
        )}
      </div>
    </div>
  )
}
