import { useState, useEffect } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
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
      <button
        onClick={() => window.api.window.minimize()}
        className="h-full w-12 flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark
                   hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Minimize"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={() => {
          window.api.window.maximize()
          setIsMaximized(!isMaximized)
        }}
        className="h-full w-12 flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark
                   hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <Copy size={14} /> : <Square size={14} />}
      </button>
      <button
        onClick={() => window.api.window.close()}
        className="h-full w-12 flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark
                   hover:bg-red-500 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  )
}