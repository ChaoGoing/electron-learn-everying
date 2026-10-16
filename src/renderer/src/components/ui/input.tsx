import * as React from 'react'

import { cn } from '@renderer/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>): React.JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full rounded-lg border border-border-light dark:border-border-dark bg-black/5 dark:bg-white/10 px-3 py-2 text-sm',
        'text-text-primary-light dark:text-text-primary-dark',
        'placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark',
        'transition-colors focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}

export { Input }
