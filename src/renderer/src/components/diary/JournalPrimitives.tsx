/**
 * 页记 · 纸感 UI 原语。
 *
 * 设计稿（`paper-journal`）自成一套控件规格——圆角 11/16px、高度 40px、
 * 陶土红强调、纸白描边——与应用的 Windows 11 `ui/*` 基件不同。这里把重复出现的
 * 几组类名收敛成小组件，卡片板 / 编排 / 回顾三层共用，避免每个文件重抄一遍。
 * 颜色全部走 journal 调色板的语义 token（`paper-*` / `ink-*` / `terra` / `moss` …）。
 */
import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'
import { cn } from '../../lib/cn'

/* ── 类名常量 ───────────────────────────────────────────────── */

/** 卡片容器：16px 圆角、暖线描边、极轻阴影。 */
export const PANEL = 'rounded-2xl border bg-paper-card shadow-card'

/** 面板里那一行 11px / 0.1em 的小标题。 */
export const SECTION_LABEL = 'text-[11px] tracking-[0.1em] text-ink-soft'

/** 面板底部：虚线上边 + 13px 内距的说明行。 */
export const PANEL_FOOT =
  'mt-auto border-t border-dashed border-paper-line-soft pt-[13px] text-[11.5px] text-ink-soft'

/** 编排模式里的小输入框（设计稿「页面设置」的 34px 输入）。 */
export const JOURNAL_INPUT =
  'h-[34px] w-full rounded-[9px] border border-paper-line-dash bg-paper-card px-2.5 text-[12.5px] text-ink-strong outline-none placeholder:text-ink-soft focus:border-terra'

/* ── 自动增高的多行输入 ─────────────────────────────────────── */

/**
 * 随内容增高的 textarea。卡片正文直接用它编辑，避免设计稿的卡片高度被固定住。
 * 高度在输入后同步，因此无需 `ResizeObserver`。
 */
export function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
  minRows = 3
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  minRows?: number
}): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback((): void => {
    const node = ref.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [])

  useLayoutEffect(resize, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event): void => onChange(event.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={cn(
        'w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-ink-faint',
        className
      )}
    />
  )
}

/* ── 容器 ───────────────────────────────────────────────────── */

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** 底色：card = 纸白，warm = 米黄（日期卡 / 统计卡），dashed = 虚线提示卡。 */
  tone?: 'card' | 'warm' | 'dashed'
  as?: 'section' | 'article' | 'div' | 'aside'
}

export function Panel({
  tone = 'card',
  as: Tag = 'section',
  className,
  children,
  ...rest
}: PanelProps): JSX.Element {
  return (
    <Tag
      className={cn(
        PANEL,
        tone === 'card' && 'border-paper-line-soft',
        tone === 'warm' && 'border-paper-line-strong bg-paper-card-warm',
        tone === 'dashed' && 'border-dashed border-paper-line-dash bg-paper-surface',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** 面板头部：左侧标题、右侧补充信息。 */
export function PanelHeader({
  label,
  aside,
  icon,
  className
}: {
  label: React.ReactNode
  aside?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}): JSX.Element {
  return (
    <div className={cn('mb-3 flex items-center gap-2', className)}>
      {icon}
      <span className={SECTION_LABEL}>{label}</span>
      {aside ? <span className="ml-auto text-[11.5px] text-ink">{aside}</span> : null}
    </div>
  )
}

/* ── 按钮 ───────────────────────────────────────────────────── */

type ButtonTone = 'primary' | 'outline' | 'ghost' | 'danger' | 'selected'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'border-ink-strong bg-ink-strong text-paper-surface hover:bg-ink-strong/90',
  outline: 'border-paper-line-dash-strong bg-paper-card text-ink-strong hover:bg-paper-sunken',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-paper-sunken',
  danger: 'border-clay-line bg-terra-wash text-clay hover:bg-clay-line/40',
  selected: 'border-terra bg-paper-selected text-ink-strong'
}

interface JournalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: 'md' | 'sm'
}

export const JournalButton = forwardRef<HTMLButtonElement, JournalButtonProps>(
  function JournalButton(
    { tone = 'outline', size = 'md', className, type = 'button', children, ...rest },
    ref
  ): JSX.Element {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-[11px] border font-medium',
          size === 'md' ? 'h-10 px-[15px] text-[13px]' : 'h-[38px] px-3 text-[12.5px]',
          BUTTON_TONES[tone],
          'cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

interface JournalIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'outline' | 'ghost' | 'bare'
  size?: number
  active?: boolean
}

/** 方形图标按钮：工具栏用 40px outline，卡片内联用 26px bare。 */
export const JournalIconButton = forwardRef<HTMLButtonElement, JournalIconButtonProps>(
  function JournalIconButton(
    { tone = 'outline', size = 40, active, className, type = 'button', children, ...rest },
    ref
  ): JSX.Element {
    const bare = tone === 'bare'
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors',
          bare ? 'rounded-[7px]' : 'rounded-[11px] border',
          !bare && tone === 'outline' && 'border-paper-line-dash-strong bg-paper-card',
          !bare && tone === 'ghost' && 'border-transparent bg-transparent',
          active
            ? 'bg-paper-selected text-ink-strong'
            : bare
              ? 'text-ink-faint hover:bg-paper-sunken hover:text-ink'
              : 'text-ink hover:bg-paper-sunken',
          className
        )}
        style={{ width: size, height: size }}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

/* ── 胶囊 / 标签 ────────────────────────────────────────────── */

type ChipTone = 'sand' | 'paper' | 'moss' | 'terra' | 'iris' | 'amber' | 'line'

const CHIP_TONES: Record<ChipTone, string> = {
  sand: 'bg-paper-sunken text-ink',
  paper: 'bg-paper-card text-ink',
  moss: 'bg-moss-soft text-moss-ink',
  terra: 'bg-terra-tint text-terra-tint-ink',
  iris: 'bg-iris/12 text-iris',
  amber: 'bg-amber/14 text-amber',
  line: 'border border-paper-line bg-transparent text-ink'
}

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone
  size?: 'md' | 'sm'
}

export function Chip({
  tone = 'sand',
  size = 'md',
  className,
  children,
  ...rest
}: ChipProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        size === 'md' ? 'h-7 px-[11px] text-xs' : 'h-6 px-[9px] text-[11.5px]',
        CHIP_TONES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

/** 分段控件（时间轴 / 日历 / 回顾，以及本周 / 本月 / 今年）。 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className
}: {
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>
  value: T
  onChange: (value: T) => void
  className?: string
}): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[3px] rounded-xl border border-paper-line bg-paper-sunken p-[3px]',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={(): void => onChange(option.value)}
          aria-current={value === option.value ? 'page' : undefined}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-4 text-[13px] transition-colors',
            value === option.value
              ? 'bg-paper-card font-medium text-ink-strong shadow-card'
              : 'text-ink hover:text-ink-strong'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** 细进度条（清单完成度 / 记录天数 / 标签分布）。 */
export function ProgressBar({
  value,
  className,
  barClassName
}: {
  /** 0–1 */
  value: number
  className?: string
  barClassName?: string
}): JSX.Element {
  const percent = Math.min(100, Math.max(0, value * 100))
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-paper-selected', className)}>
      <div
        className={cn('h-full rounded-full bg-terra-bright', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** 统计数字：Garamond 字体 + 单位后缀，用于回顾页与今日小结。 */
export function StatNumber({
  value,
  unit,
  size = 'lg',
  className
}: {
  value: React.ReactNode
  unit?: React.ReactNode
  size?: 'lg' | 'xl' | 'md'
  className?: string
}): JSX.Element {
  return (
    <div className={cn('flex items-baseline gap-1.5', className)}>
      <span
        className={cn(
          'font-display font-semibold leading-none text-ink-strong',
          size === 'xl' && 'text-[38px]',
          size === 'lg' && 'text-[30px]',
          size === 'md' && 'text-[17px]'
        )}
      >
        {value}
      </span>
      {unit ? <span className="text-xs text-ink">{unit}</span> : null}
    </div>
  )
}
