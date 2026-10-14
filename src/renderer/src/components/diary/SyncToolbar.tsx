import { useEffect, useState } from 'react'
import { Upload, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { useSyncStore } from '../../stores/syncStore'

interface SyncToolbarProps {
  onSynced?: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

const iconButtonClass =
  'w-8 h-8 rounded-md text-text-secondary-light dark:text-text-secondary-dark ' +
  'hover:text-text-primary-light dark:hover:text-text-primary-dark'

/**
 * Compact sync controls for the list header: a status dot (at-a-glance state)
 * plus upload/download icon buttons. The detailed status line lives in the
 * dot's tooltip so the header stays a single, uncluttered row.
 */
export function SyncToolbar({ onSynced }: SyncToolbarProps): JSX.Element {
  const { status, isPushing, isPulling, refresh, push, pull } = useSyncStore()
  const [note, setNote] = useState<string | null>(null)
  const busy = isPushing || isPulling

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handlePush = async (): Promise<void> => {
    try {
      const result = await push()
      // Non-fatal: the server skipped some entries (e.g. a delete whose `updatedAt`
      // is older than the server's copy). Surface it instead of silently failing.
      setNote(
        result.staleCount > 0
          ? `${result.staleCount} 条因服务端已有更新版本被跳过，删除可能未生效，请点“下载”再试`
          : null
      )
    } catch {
      // Errors are surfaced via status.lastError.
      setNote(null)
    }
  }

  const handlePull = async (): Promise<void> => {
    try {
      await pull()
      onSynced?.()
    } catch {
      // Errors are surfaced via status.lastError.
    }
  }

  const dotClass = status.lastError
    ? 'bg-red-500'
    : status.pendingCount > 0
      ? 'bg-amber-400'
      : 'bg-green-500'

  const statusTitle = status.lastError
    ? status.lastError
    : `待上传 ${status.pendingCount} 篇` +
      (status.lastPullAt ? ` · ${formatTime(status.lastPullAt)} 已下载` : '') +
      (note ? ` · ${note}` : '')

  return (
    <div className="flex items-center gap-1">
      {/* Sync state dot — details live in the tooltip */}
      <span
        className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass, busy && 'animate-pulse')}
        title={statusTitle}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePush}
        disabled={busy}
        className={iconButtonClass}
        title="上传本地变化到服务器"
        aria-label="上传本地变化到服务器"
      >
        <Upload size={15} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePull}
        disabled={busy}
        className={iconButtonClass}
        title="从服务器下载变化"
        aria-label="从服务器下载变化"
      >
        <Download size={15} />
      </Button>
    </div>
  )
}
