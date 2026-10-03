'use client'

import { ComingSoonDialog } from '@/components/coming-soon-dialog'
import { Button } from '@/components/ui/button'

/** Study groups chat is planned for a follow-up Postgres migration; UI stays available with clear expectations. */
export function CourseStudyGroups({ courseId: _courseId }: { courseId: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Study groups</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Text chat and polls for course study groups will appear here after the Postgres study-group tables ship.
      </p>
      <ComingSoonDialog feature="Study group chat" description="Create groups, message classmates, and run quick polls">
        {open => (
          <Button type="button" className="mt-3" variant="outline" size="sm" onClick={open}>
            Preview study groups
          </Button>
        )}
      </ComingSoonDialog>
    </section>
  )
}
