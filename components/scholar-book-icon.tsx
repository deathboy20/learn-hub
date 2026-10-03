import type { ComponentProps } from 'react'
import { BookOpen, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Scholar mascot: cap + book (AI study assistant). */
export function ScholarBookIcon({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} {...props}>
      <BookOpen className="size-[0.85em] opacity-90" aria-hidden />
      <GraduationCap
        className="absolute -right-[0.15em] -top-[0.35em] size-[0.55em] drop-shadow-sm"
        aria-hidden
      />
    </span>
  )
}
