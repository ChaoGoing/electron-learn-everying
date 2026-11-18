/**
 * 卡片视图：外壳 + 正文 + 各类型默认的头部/底部装饰。
 *
 * 三种使用场景（卡片板 / 阅读页 / 编排页）都走这一个组件，差别只在 `mode`
 * 与是否传拖拽、选中相关的 props。
 */
import { CardShell } from './CardShell'
import { CardTypeIconOf, DiaryCardBody, type CardPatch } from './DiaryCardBody'
import type { DropSide } from '../../lib/diaryCards'
import type { DiaryCard } from '../../../../shared/types/diary'

export interface DiaryCardViewProps {
  card: DiaryCard
  mode?: 'read' | 'edit'
  patch?: CardPatch
  /** 阅读/编排模式下放在头部右侧的操作按钮。 */
  actions?: React.ReactNode
  headerAside?: React.ReactNode
  footer?: React.ReactNode
  selected?: boolean
  draggable?: boolean
  dragging?: boolean
  dropTarget?: boolean
  /** 落点在卡片的哪一侧。 */
  dropSide?: DropSide
  onDragStart?: React.DragEventHandler<HTMLElement>
  onDragEnd?: React.DragEventHandler<HTMLElement>
  onDragOver?: React.DragEventHandler<HTMLElement>
  onDrop?: React.DragEventHandler<HTMLElement>
  onClick?: React.MouseEventHandler<HTMLElement>
  className?: string
}

export function DiaryCardView({
  card,
  mode = 'read',
  patch,
  actions,
  headerAside,
  footer,
  selected,
  draggable,
  dragging,
  dropTarget,
  dropSide,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  className
}: DiaryCardViewProps): JSX.Element {
  // 清单卡在头尾补上完成度信息，与设计稿的「2 / 3 已完成」一致。
  const checklistAside =
    card.type === 'checklist' && mode === 'read' && card.variant === 'list'
      ? `${card.items.filter((item) => item.done).length} / ${card.items.length} 已完成`
      : null

  return (
    <CardShell
      card={card}
      icon={<CardTypeIconOf type={card.type} />}
      actions={actions}
      headerAside={headerAside ?? checklistAside}
      footer={footer}
      selected={selected}
      draggable={draggable}
      dragging={dragging}
      dropTarget={dropTarget}
      dropSide={dropSide}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={className}
    >
      <DiaryCardBody card={card} mode={mode} patch={patch} />
    </CardShell>
  )
}
