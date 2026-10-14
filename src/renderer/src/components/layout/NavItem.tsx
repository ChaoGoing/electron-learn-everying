import { type LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'

interface NavItemProps {
  icon: LucideIcon
  label: string
  isActive?: boolean
  onClick?: () => void
}

export function NavItem({ icon: Icon, label, isActive, onClick }: NavItemProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'relative w-10 h-10 rounded-lg group',
        'text-text-primary-light dark:text-text-primary-dark',
        isActive && 'bg-accent/15 text-accent hover:bg-accent/20'
      )}
    >
      <Icon size={20} />
      {/* Windows 11 pill-shaped active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-full" />
      )}
      {/* Tooltip */}
      <span
        className="absolute left-14 px-2 py-1 text-xs font-medium bg-gray-800 dark:bg-gray-200
                   text-white dark:text-gray-800 rounded-md opacity-0 group-hover:opacity-100
                   transition-opacity pointer-events-none whitespace-nowrap z-50"
      >
        {label}
      </span>
    </Button>
  )
}
