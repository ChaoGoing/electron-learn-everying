import * as React from 'react'

import { cn } from '@renderer/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full rounded-lg border border-border-light dark:border-border-dark bg-black/5 dark:bg-white/10 px-3 py-2 text-sm',
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

export { Textarea }
