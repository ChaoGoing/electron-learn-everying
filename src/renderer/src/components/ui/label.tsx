import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@renderer/lib/utils'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-sm font-medium text-text-primary-light dark:text-text-primary-dark leading-none',
        'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}

export { Label }
