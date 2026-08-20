import { WindowControls } from './WindowControls'

export function TitleBar(): JSX.Element {
  return (
    <header
      className="drag-region h-10 flex items-center justify-between bg-surface-light dark:bg-surface-dark
                 border-b border-border-light dark:border-border-dark smooth-theme shrink-0"
    >
      {/* App icon + title */}
      <div className="flex items-center gap-2 pl-3 select-none">
        <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          Learn Everything
        </span>
      </div>

      {/* Window controls — right side */}
      <WindowControls />
    </header>
  )
}