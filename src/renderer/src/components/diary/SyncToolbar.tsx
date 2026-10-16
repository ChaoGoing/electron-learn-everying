import { useEffect, useState } from 'react'
import { Upload, Download, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'
import { useSyncStore } from '../../stores/syncStore'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip'

interface SyncToolbarProps {
  onSynced?: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

const actionButtonClass =
  'h-7 w-7 rounded-md text-text-secondary-light dark:text-text-secondary-dark ' +
  'hover:bg-black/[0.06] hover:text-text-primary-light dark:hover:bg-white/[0.12] dark:hover:text-text-primary-dark'

/**
 * Compact sync cluster for the list header: one soft pill containing a status
 * dot plus joined upload/download actions. The upload action carries a pending
 * count badge. Detailed state (last sync time / errors) lives in the dot's
 * tooltip so the header stays a single, quiet row.
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
    <div className="flex items-center gap-0.5 rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.07]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="flex items-center justify-center rounded-md p-1.5">
            <span
              className={cn(
                'block h-1.5 w-1.5 shrink-0 rounded-full',
                dotClass,
                busy && 'animate-pulse'
              )}
            />
          </TooltipTrigger>
          <TooltipContent>{statusTitle}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePush}
        disabled={busy}
        className={cn(actionButtonClass, 'relative')}
        title="上传本地变化到服务器"
        aria-label="上传本地变化到服务器"
      >
        {isPushing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {status.pendingCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-semibold leading-none text-black"
            aria-label={`${status.pendingCount} 篇待上传`}
          >
            {status.pendingCount}
          </span>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handlePull}
        disabled={busy}
        className={actionButtonClass}
        title="从服务器下载变化"
        aria-label="从服务器下载变化"
      >
        {isPulling ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      </Button>
    </div>
  )
}
