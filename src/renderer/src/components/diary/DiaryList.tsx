import { Plus } from 'lucide-react'
import { DiaryCard } from './DiaryCard'
import { SyncToolbar } from './SyncToolbar'
import { Button } from '../ui/button'
import type { DiaryEntry } from '../../../../shared/types/diary'

interface DiaryListProps {
  entries: DiaryEntry[]
  selectedId: string | null
  onSelect: (entry: DiaryEntry) => void
  onNewEntry: () => void
  onToggleFavorite?: (entry: DiaryEntry) => void
  onEdit?: (entry: DiaryEntry) => void
  onSynced?: () => void
}

export function DiaryList({
  entries,
  selectedId,
  onSelect,
  onNewEntry,
  onToggleFavorite,
  onEdit,
  onSynced
}: DiaryListProps): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      {/* Header: title + compact sync cluster + new-entry */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border-light dark:border-border-dark">
        <h2 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-nowrap">
          {entries.length === 0 ? '日记列表' : `${entries.length} 篇日记`}
        </h2>
        <div className="flex items-center gap-0.5">
          <SyncToolbar onSynced={onSynced} />
          <Button
            size="icon"
            onClick={onNewEntry}
            className="w-8 h-8 rounded-md"
            title="写日记"
            aria-label="写日记"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary-light dark:text-text-secondary-dark">
            <p className="text-sm">暂无日记</p>
            <Button
              variant="link"
              onClick={onNewEntry}
              className="mt-2 text-sm hover:text-accent-hover"
            >
              写一篇日记
            </Button>
          </div>
        ) : (
          entries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              isActive={entry.id === selectedId}
              onClick={() => onSelect(entry)}
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  )
}
