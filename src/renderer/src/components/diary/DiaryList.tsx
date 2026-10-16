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
  onDelete?: (entry: DiaryEntry) => void
  onEdit?: (entry: DiaryEntry) => void
  onSynced?: () => void
}

export function DiaryList({
  entries,
  selectedId,
  onSelect,
  onNewEntry,
  onDelete,
  onEdit,
  onSynced
}: DiaryListProps): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      {/* Header: title + compact sync cluster + new-entry */}
      <div className="flex items-center justify-between gap-2 border-b border-border-light px-3 py-2 dark:border-border-dark">
        <h2 className="whitespace-nowrap text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
          {entries.length === 0 ? '日记列表' : `${entries.length} 篇日记`}
        </h2>
        <div className="flex items-center gap-1.5">
          <SyncToolbar onSynced={onSynced} />
          <Button
            size="icon"
            onClick={onNewEntry}
            className="h-8 w-8 rounded-md"
            title="写日记"
            aria-label="写日记"
          >
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 space-y-0.5 overflow-auto p-1.5">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-secondary-light dark:text-text-secondary-dark">
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
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  )
}
