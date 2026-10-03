'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { postAction } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/workspace/loading-state'

export function MyCourses() {
  const { data, isLoading, refetch } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  const offerings = data.offerings as Array<Record<string, unknown>>

  async function enroll(offeringId: string) {
    try {
      await postAction('enroll', { offering_id: offeringId })
      toast.success('Enrolled successfully')
      await refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enrollment failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">My courses</h1>
      <ul className="space-y-3">
        {offerings.map(o => (
          <li key={String(o.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold">{String(o.title)} ({String(o.code)})</p>
              <p className="text-sm text-muted-foreground">{String(o.term_name)} · {String(o.lecturer_name)} · {String(o.enrolled_count)}/{String(o.capacity)} enrolled</p>
            </div>
            {o.enrolled ? (
              <Link href={`/my-courses/${o.course_id}`} className="text-sm font-medium text-primary" title="Resources, quizzes, and study groups">Open course →</Link>
            ) : (
              <Button size="sm" onClick={() => enroll(String(o.id))}>Enroll</Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
