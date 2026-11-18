/**
 * 日记模块的页内顶栏（设计稿的「页记」横条）。
 *
 * 应用外壳仍是"无边框标题栏 + 左侧导航"，这条顶栏是日记模块内部的
 * 视图切换 + 工具区：左「页记」标识，中间 时间轴/日历/回顾/素材库，
 * 右侧由各页传入自己的操作（卡片板给「写今日」，编排模式给撤销/重做/完成）。
 */
import { useNavigate } from 'react-router-dom'
import { PenLine, Search, User } from 'lucide-react'
import { JournalButton, JournalIconButton, SegmentedControl } from './JournalPrimitives'

export type JournalView = 'timeline' | 'calendar' | 'recap' | 'library' | 'entry'

const NAV_ITEMS: Array<{ value: JournalView; label: string; path: string }> = [
  { value: 'timeline', label: '时间轴', path: '/diary' },
  { value: 'calendar', label: '日历', path: '/diary/calendar' },
  { value: 'recap', label: '回顾', path: '/diary/recap' },
  { value: 'library', label: '素材库', path: '/diary/library' }
]

export function JournalMark({ size = 26 }: { size?: number }): JSX.Element {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[7px] bg-terra text-paper-surface"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 26 26" fill="none">
        <path
          d="M8.4 7.6h9.2M8.4 13h9.2M8.4 18.4h5.6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export interface JournalToolbarProps {
  view: JournalView
  /** 右侧操作区；不给则显示默认的搜索 / 写今日 / 账户。 */
  actions?: React.ReactNode
  onWriteToday?: () => void
  onSearch?: () => void
}

export function JournalToolbar({
  view,
  actions,
  onWriteToday,
  onSearch
}: JournalToolbarProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <header className="flex flex-none flex-wrap items-center gap-x-[18px] gap-y-2 border-b border-paper-line bg-paper-surface px-[26px] py-2.5">
      <button
        type="button"
        onClick={(): void => {
          navigate('/diary')
        }}
        className="flex flex-none cursor-pointer items-center gap-2.5"
      >
        <JournalMark />
        <span className="font-display text-[19px] font-semibold tracking-[0.05em] text-ink-strong">
          页记
        </span>
      </button>

      <SegmentedControl<JournalView>
        options={NAV_ITEMS.map((item) => ({ value: item.value, label: item.label }))}
        value={view}
        onChange={(next): void => {
          const target = NAV_ITEMS.find((item) => item.value === next)
          if (target) navigate(target.path)
        }}
      />

      <div className="ml-auto flex flex-none items-center gap-2.5">
        {actions ?? (
          <>
            <JournalIconButton
              aria-label="搜索"
              onClick={
                onSearch ??
                ((): void => {
                  navigate('/search')
                })
              }
            >
              <Search size={16} />
            </JournalIconButton>
            {onWriteToday ? (
              <JournalButton tone="primary" onClick={onWriteToday}>
                <PenLine size={14} />
                写今日
              </JournalButton>
            ) : null}
            <button
              type="button"
              aria-label="账户"
              onClick={(): void => {
                navigate('/settings')
              }}
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-paper-line-dash-strong bg-paper-sunken text-ink"
            >
              <User size={17} />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
