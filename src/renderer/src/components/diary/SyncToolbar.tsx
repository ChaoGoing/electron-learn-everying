import { useEffect, useState } from 'react'
import { Upload, Download } from 'lucide-react'
import { useSyncStore } from '../../stores/syncStore'

interface SyncToolbarProps {
  onSynced?: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

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

  const buttonClass =
    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium ' +
    'border border-border-light dark:border-border-dark ' +
    'bg-surface-light dark:bg-surface-dark ' +
    'hover:bg-black/5 dark:hover:bg-white/10 ' +
    'text-text-primary-light dark:text-text-primary-dark ' +
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="px-3 py-2 border-b border-border-light dark:border-border-dark space-y-1.5">
      <div className="flex gap-1.5">
        <button
          onClick={handlePush}
          disabled={busy}
          className={buttonClass}
          title="上传本地变化到服务器"
        >
          <Upload size={13} />
          {isPushing ? '上传中…' : '上传'}
        </button>
        <button
          onClick={handlePull}
          disabled={busy}
          className={buttonClass}
          title="从服务器下载变化"
        >
          <Download size={13} />
          {isPulling ? '下载中…' : '下载'}
        </button>
      </div>

      {status.lastError ? (
        <p className="text-[11px] leading-tight text-red-500 break-words">{status.lastError}</p>
      ) : (
        <p className="text-[11px] leading-tight text-text-secondary-light dark:text-text-secondary-dark">
          待上传 {status.pendingCount} 篇
          {status.lastPullAt ? ` · ${formatTime(status.lastPullAt)} 已下载` : ''}
        </p>
      )}

      {!status.lastError && note ? (
        <p className="text-[11px] leading-tight text-amber-500 break-words">{note}</p>
      ) : null}
    </div>
  )
}
