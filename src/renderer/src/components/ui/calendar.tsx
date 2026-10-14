import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayButton, DayPicker } from 'react-day-picker'

import { Button, buttonVariants } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type CalendarButtonVariant = React.ComponentProps<typeof Button>['variant']

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = 'ghost',
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: CalendarButtonVariant
}): React.JSX.Element {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('[--cell-size:2rem] group/calendar', className)}
      classNames={{
        root: 'w-fit',
        months: 'relative flex flex-col gap-3',
        month: 'flex w-full flex-col gap-2',
        nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-7 select-none rounded-lg p-0',
          'text-text-secondary-light dark:text-text-secondary-dark',
          'hover:text-text-primary-light dark:hover:text-text-primary-dark',
          'aria-disabled:opacity-50'
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-7 select-none rounded-lg p-0',
          'text-text-secondary-light dark:text-text-secondary-dark',
          'hover:text-text-primary-light dark:hover:text-text-primary-dark',
          'aria-disabled:opacity-50'
        ),
        month_caption: 'flex h-7 w-full items-center justify-center px-7',
        caption_label:
          'select-none text-sm font-medium text-text-primary-light dark:text-text-primary-dark',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex-1 select-none rounded-md py-1 text-xs font-normal text-text-secondary-light dark:text-text-secondary-dark',
        week: 'flex w-full',
        day: 'rdp-day group/day relative aspect-square h-full w-full min-w-[--cell-size] select-none p-0 text-center',
        outside: 'text-text-secondary-light dark:text-text-secondary-dark opacity-50',
        disabled: 'opacity-50',
        hidden: 'invisible',
        ...classNames
      }}
      components={{
        Chevron: ({ className, orientation = 'left' }) => {
          if (orientation === 'left') {
            return <ChevronLeft className={cn('size-4', className)} />
          }
          if (orientation === 'right') {
            return <ChevronRight className={cn('size-4', className)} />
          }
          return <ChevronDown className={cn('size-4', className)} />
        },
        DayButton: CalendarDayButton,
        ...components
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof DayButton>): React.JSX.Element {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative flex aspect-square h-auto w-full min-w-[--cell-size] items-center justify-center',
        'rounded-lg p-0 text-sm font-normal leading-none transition-colors',
        'text-text-primary-light dark:text-text-primary-dark',
        'hover:bg-black/5 dark:hover:bg-white/10',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent/40',
        'aria-selected:bg-accent aria-selected:text-white',
        'aria-selected:hover:bg-accent-hover aria-selected:dark:hover:bg-accent-hover',
        'data-[today=true]:text-accent data-[today=true]:font-semibold',
        className
      )}
      aria-selected={modifiers.selected || undefined}
      data-today={modifiers.today && !modifiers.selected ? true : undefined}
      {...props}
    >
      {children}
    </button>
  )
}

export { Calendar, CalendarDayButton }
