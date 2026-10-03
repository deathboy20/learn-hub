'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import dynamic from 'next/dynamic'

const WeeklyActivityChart = dynamic(
  () => import('@/components/workspace/weekly-activity-chart').then(m => m.WeeklyActivityChart),
  { loading: () => <LoadingState label="Loading activity chart…" /> },
)
import { useWorkspace } from '@/hooks/use-workspace'
import { EmptyState, LoadingState } from '@/components/workspace/loading-state'
import { progressPercent } from '@/lib/domain'

export function StudentDashboard() {
  const { data, isLoading } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  const enrolled = (data.offerings as Array<Record<string, unknown>>).filter(o => o.enrolled)
  const completed = (data.progress as Array<{ completed: boolean }>).filter(p => p.completed).length
  const progressTotal = (data.progress as unknown[]).length
  const overall = progressPercent(completed, Math.max(progressTotal, 1))
  const term = (data.terms as Array<Record<string, unknown>>)[0]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{term ? String(term.name) : 'Current term'}</p>
        <h1 className="text-3xl font-bold">Welcome, {data.actor.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Level {data.actor.level ?? 'N/A'} · {enrolled.length} active courses</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Overall progress</CardTitle><CardDescription>Resources marked complete</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{overall}%</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Quizzes</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(data.attempts as unknown[]).length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Bookmarks</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(data.bookmarks as unknown[]).length}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Continue learning</CardTitle><CardDescription>Your enrolled courses</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {enrolled.slice(0, 5).map(o => (
              <Link key={String(o.id)} href={`/my-courses/${o.course_id}`} className="block rounded-lg border border-border p-3 hover:bg-muted/50" title="Open course hub, resources, and study groups">
                <p className="font-medium">{String(o.title)}</p>
                <p className="text-xs text-muted-foreground">{String(o.code)} · {String(o.lecturer_name)}</p>
              </Link>
            ))}
            {enrolled.length === 0 && <EmptyState title="No enrollments yet" description="Browse offerings and enroll from My courses." />}
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Weekly activity</CardTitle>
            <CardDescription>When you mark resources complete or update progress</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] pb-4">
            <WeeklyActivityChart data={data.activity as Array<{ date: string; views: number }>} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent resources</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {(data.resources as Array<Record<string, unknown>>).slice(0, 8).map(r => (
            <Link key={String(r.id)} href={`/resources/${r.id}`} className="flex justify-between py-3 text-sm hover:text-primary">
              <span>{String(r.title)}</span>
              <span className="text-muted-foreground">{String(r.code)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
