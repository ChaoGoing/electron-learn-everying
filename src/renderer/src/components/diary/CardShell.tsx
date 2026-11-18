/**
 * 卡片外壳：设计稿里每张卡片共用的骨架。
 *
 * 结构 —— 头部（图标 + 标题 + 补充信息 + 操作 + 时刻）/ 正文 / 底部虚线说明。
 * 底色、描边、内边距、版式宽度都来自卡片数据，外壳只负责"长什么样"，
 * 不关心卡片类型；正文由 `DiaryCardBody` 按类型渲染。
 */
import { GripVertical } from 'lucide-react'
import {
  CARD_BACKGROUND_BORDER,
  CARD_BACKGROUND_HEX,
  CARD_MIN_WIDTH,
  CARD_WIDTH_FLEX,
  DEFAULT_CARD_TITLES,
  type DropSide
} from '../../lib/diaryCards'
import type { DiaryCard } from '../../../../shared/types/diary'
import { JournalIconButton, PANEL_FOOT } from './JournalPrimitives'

export interface CardShellProps {
  card: DiaryCard
  icon: React.ReactNode
  /** 头部右侧的操作区（阅读模式是文字按钮，编排模式是上移/下移/复制/删除）。 */
  actions?: React.ReactNode
  /** 底部虚线说明行。 */
  footer?: React.ReactNode
  /** 头部里的补充信息（清单的「2 / 3 已完成」、编排模式的「已选中」）。 */
  headerAside?: React.ReactNode
  children: React.ReactNode
  /** 编排模式：选中描边 + 八向手柄 + 可拖动。 */
  selected?: boolean
  draggable?: boolean
  dragging?: boolean
  /** 正被拖过的落点卡片。 */
  dropTarget?: boolean
  /** 落点在这张卡片的哪一侧（决定指示条画在左边还是右边）。 */
  dropSide?: DropSide
  onDragStart?: React.DragEventHandler<HTMLElement>
  onDragEnd?: React.DragEventHandler<HTMLElement>
  onDragOver?: React.DragEventHandler<HTMLElement>
  onDrop?: React.DragEventHandler<HTMLElement>
  onClick?: React.MouseEventHandler<HTMLElement>
  className?: string
}

/** 选中态的四角 + 四边中点手柄（设计稿的 8 个方点）。 */
interface HandlePosition {
  left?: number | string
  right?: number
  top?: number | string
  bottom?: number
  ml?: number
  mt?: number
}

const HANDLE_POSITIONS: HandlePosition[] = [
  { left: -6, top: -6 },
  { left: '50%', top: -6, ml: -5.5 },
  { right: -6, top: -6 },
  { left: -6, top: '50%', mt: -5.5 },
  { right: -6, top: '50%', mt: -5.5 },
  { left: -6, bottom: -6 },
  { left: '50%', bottom: -6, ml: -5.5 },
  { right: -6, bottom: -6 }
]

export function CardShell({
  card,
  icon,
  actions,
  footer,
  headerAside,
  children,
  selected,
  draggable,
  dragging,
  dropTarget,
  dropSide = 'after',
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  className
}: CardShellProps): JSX.Element {
  return (
    <section
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      style={{
        flex: CARD_WIDTH_FLEX[card.width],
        minWidth: CARD_MIN_WIDTH,
        backgroundColor: CARD_BACKGROUND_HEX[card.background],
        borderColor: selected ? 'var(--color-terra)' : CARD_BACKGROUND_BORDER[card.background],
        padding: `${Math.max(10, card.padding - 4)}px ${card.padding}px ${card.padding}px`,
        boxShadow: selected
          ? '0 0 0 2px var(--color-terra), 0 1px 2px rgba(84, 64, 38, 0.045)'
          : undefined,
        cursor: draggable ? 'grab' : undefined
      }}
      className={[
        // group：卡片板上的操作按钮靠 group-hover 才浮现
        'group relative flex min-w-0 flex-col rounded-2xl border shadow-card',
        dragging ? 'journal-dragging' : '',
        dropTarget ? 'journal-drop-target' : '',
        className ?? ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 落点指示：虚线描边 + 一条贴在插入侧的颜色条，明确"会插到这张的前面还是后面" */}
      {dropTarget ? (
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-y-1 w-[3px] rounded-full bg-terra',
            dropSide === 'before' ? '-left-[7px]' : '-right-[7px]'
          ].join(' ')}
        />
      ) : null}

      {selected
        ? HANDLE_POSITIONS.map((position, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="absolute size-[11px] rounded-[3px] border-2 border-terra bg-paper-card"
              style={{
                left: position.left,
                right: position.right,
                top: position.top,
                bottom: position.bottom,
                marginLeft: position.ml,
                marginTop: position.mt
              }}
            />
          ))
        : null}

      <header className="mb-3 flex items-center gap-[7px] text-[11px] tracking-[0.1em] text-ink-soft">
        {icon}
        <span className="truncate">{card.title || DEFAULT_CARD_TITLES[card.type]}</span>
        {headerAside}
        <span className="ml-auto flex items-center gap-0.5">
          {draggable ? (
            <JournalIconButton
              tone="bare"
              size={26}
              aria-label="拖动这张卡片"
              title="拖动排序"
              className="cursor-grab text-ink-faint"
            >
              <GripVertical size={14} />
            </JournalIconButton>
          ) : null}
          {actions}
        </span>
        {card.time ? (
          <span className="font-display text-xs tracking-normal text-ink-soft">{card.time}</span>
        ) : null}
      </header>

      {children}

      {footer ? <div className={PANEL_FOOT}>{footer}</div> : null}
    </section>
  )
}
