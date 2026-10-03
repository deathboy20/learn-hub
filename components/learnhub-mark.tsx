import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LearnHubMark({
  compact = false,
  variant = 'sidebar',
  className,
}: {
  compact?: boolean
  variant?: 'sidebar' | 'default'
  className?: string
}) {
  const onSidebar = variant === 'sidebar'
  return (
    <Link
      href="/"
      aria-label="LearnHub home"
      className={cn('inline-flex items-center gap-2.5 no-underline', className)}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg shadow-sm',
          onSidebar
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        <GraduationCap className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span
          className={cn(
            'flex flex-col leading-tight',
            onSidebar ? 'text-sidebar-foreground' : 'text-foreground',
          )}
        >
          <span className="text-lg font-semibold tracking-tight">LearnHub</span>
          <span
            className={cn(
              'mt-0.5 text-xs',
              onSidebar ? 'text-sidebar-foreground/75' : 'text-muted-foreground',
            )}
          >
            Academic learning workspace
          </span>
        </span>
      )}
    </Link>
  )
}
