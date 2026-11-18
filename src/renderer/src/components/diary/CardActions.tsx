/**
 * 卡片操作：删除（以及编辑、复制）。
 *
 * 卡片本身是可点的（点开阅读页），所以这里的每个按钮都要 `stopPropagation`，
 * 否则点删除会顺带跳走。默认悬停才浮现，鼠标移开就消失，免得卡片板上一片按钮。
 */
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { JournalIconButton } from './JournalPrimitives'

export interface CardActionsProps {
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  /** 悬停才显现（卡片板上用）；编排模式常显。 */
  revealOnHover?: boolean
  className?: string
}

export function CardActions({
  onEdit,
  onDuplicate,
  onDelete,
  revealOnHover = false,
  className
}: CardActionsProps): JSX.Element {
  const stop =
    (handler: () => void) =>
    (event: React.MouseEvent): void => {
      event.stopPropagation()
      handler()
    }

  return (
    <span
      className={cn(
        'flex items-center gap-0.5',
        revealOnHover &&
          'opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100',
        className
      )}
    >
      {onEdit ? (
        <JournalIconButton
          tone="bare"
          size={26}
          aria-label="编辑这张卡片"
          title="编辑"
          onClick={stop(onEdit)}
        >
          <Pencil size={13} />
        </JournalIconButton>
      ) : null}
      {onDuplicate ? (
        <JournalIconButton
          tone="bare"
          size={26}
          aria-label="复制这张卡片"
          title="复制"
          onClick={stop(onDuplicate)}
        >
          <Copy size={13} />
        </JournalIconButton>
      ) : null}
      {onDelete ? (
        <JournalIconButton
          tone="bare"
          size={26}
          aria-label="删除这张卡片"
          title="删除"
          className="text-clay hover:text-clay"
          onClick={stop(onDelete)}
        >
          <Trash2 size={13} />
        </JournalIconButton>
      ) : null}
    </span>
  )
}
