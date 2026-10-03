import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Full-width workspace content shell (matches My courses / dashboards). */
export function WorkspacePageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('w-full max-w-6xl space-y-6', className)}>{children}</div>
}
