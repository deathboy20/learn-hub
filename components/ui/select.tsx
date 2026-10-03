import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 py-1 pr-9 text-sm text-foreground shadow-xs',
          'transition-colors placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
