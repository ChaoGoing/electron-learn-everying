/**
 * 日记工作区：固定左栏 + 可滚动主区。
 *
 * 左栏放"工具"（素材、编排模板、今日提示），主区放"内容"（卡片、月级面板）。
 * 工具不参与卡片流，因此卡片增删时它们**不会漂移**——把素材当成board上的一块瓷砖，
 * 卡片一多它就跑到别处，拖拽落卡的交互会一直跳。
 *
 * 左栏用 `sticky top-0`：整个工作区只有一根滚动条（主区），左栏跟着粘住。
 */
import { cn } from '../../lib/cn'

export interface JournalWorkspaceProps {
  /** 固定左栏（工具区）。 */
  rail: React.ReactNode
  /** 主区（内容）。 */
  children: React.ReactNode
  /** 页面底色（「页面设置 · 底色」）。 */
  background?: string
  /** 外层 main 的额外类名（编排模式的 8px 网格底纹挂在这里）。 */
  mainClassName?: string
  /** 主区容器的额外类名，默认是弹性折行的卡片板。 */
  contentClassName?: string
  /** 左栏宽度，编排模式需要更宽一点。 */
  railWidth?: number
}

export function JournalWorkspace({
  rail,
  children,
  background,
  mainClassName,
  contentClassName,
  railWidth = 300
}: JournalWorkspaceProps): JSX.Element {
  return (
    <main
      className={cn('min-h-0 flex-1 overflow-y-auto px-[26px] pb-[30px] pt-[22px]', mainClassName)}
      style={background ? { backgroundColor: background } : undefined}
    >
      <div className="flex items-start gap-4">
        <aside
          className="sticky top-0 flex max-h-[calc(100vh-5rem)] shrink-0 flex-col gap-4 overflow-y-auto pb-1"
          style={{ width: railWidth }}
        >
          {rail}
        </aside>
        <div
          className={cn('min-w-0 flex-1', contentClassName ?? 'flex flex-wrap items-stretch gap-4')}
        >
          {children}
        </div>
      </div>
    </main>
  )
}
