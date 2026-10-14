import { useState, useEffect } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/cn'

interface WindowControlsProps {
  className?: string
}

export function WindowControls({ className }: WindowControlsProps): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
  }, [])

  return (
    <div className={cn('flex items-center h-full no-drag', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.api.window.minimize()}
        className="h-full w-12 rounded-none text-text-secondary-light dark:text-text-secondary-dark"
        aria-label="Minimize"
      >
        <Minus size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          window.api.window.maximize()
          setIsMaximized(!isMaximized)
        }}
        className="h-full w-12 rounded-none text-text-secondary-light dark:text-text-secondary-dark"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <Copy size={14} /> : <Square size={14} />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.api.window.close()}
        className="h-full w-12 rounded-none text-text-secondary-light dark:text-text-secondary-dark
                   hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white"
        aria-label="Close"
      >
        <X size={16} />
      </Button>
    </div>
  )
}
