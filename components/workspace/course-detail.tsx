'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { LoadingState } from '@/components/workspace/loading-state'
import { CourseStudyGroups } from '@/components/workspace/course-study-groups'

export function CourseDetail({ courseId: courseIdProp }: { courseId?: string } = {}) {
  const params = useParams<{ courseId?: string; id?: string }>()
  const courseId = courseIdProp ?? params.courseId ?? params.id ?? ''
  const { data, isLoading } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  const course = (data.courses as Array<Record<string, unknown>>).find(c => String(c.id) === courseId)
  const resources = (data.resources as Array<Record<string, unknown>>).filter(r => String(r.course_id) === courseId)
  const quizzes = (data.quizzes as Array<Record<string, unknown>>).filter(q => String(q.course_id) === courseId)
  const announcements = (data.announcements as Array<Record<string, unknown>>).filter(
    a => !a.courseId || String(a.courseId) === courseId,
  )
  const byCategory = (cat: string) =>
    resources.filter(r => String(r.category ?? '').toLowerCase().includes(cat.toLowerCase()))
  const materials = resources.filter(
    r => !byCategory('past').includes(r) && !byCategory('recording').includes(r) && !byCategory('tutorial').includes(r),
  )
  if (!course) return <p>Course not found or access denied.</p>
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-primary">{String(course.code)}</p>
        <h1 className="text-2xl font-bold">{String(course.title)}</h1>
        <p className="text-muted-foreground">{String(course.description)}</p>
      </div>
      <section>
        <h2 className="font-semibold">Announcements</h2>
        <ul className="mt-2 space-y-2">
          {announcements.length === 0 && <li className="text-sm text-muted-foreground">No announcements yet.</li>}
          {announcements.map(a => (
            <li key={String(a.id)} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{String(a.title)}</p>
              <p className="text-muted-foreground">{String(a.body)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">Materials</h2>
        <ul className="mt-2 space-y-2">{materials.map(r => <li key={String(r.id)}><Link href={`/resources/${r.id}`} className="text-primary">{String(r.title)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="font-semibold">Lecture recordings</h2>
        <ul className="mt-2 space-y-2">{byCategory('recording').map(r => <li key={String(r.id)}><Link href={`/resources/${r.id}`} className="text-primary">{String(r.title)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="font-semibold">Tutorials</h2>
        <ul className="mt-2 space-y-2">{byCategory('tutorial').map(r => <li key={String(r.id)}><Link href={`/resources/${r.id}`} className="text-primary">{String(r.title)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="font-semibold">Past questions</h2>
        <ul className="mt-2 space-y-2">{byCategory('past').map(r => <li key={String(r.id)}><Link href={`/resources/${r.id}`} className="text-primary">{String(r.title)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="font-semibold">Formal quizzes</h2>
        <ul className="mt-2 space-y-2">{quizzes.map(q => <li key={String(q.id)}><Link href={`/quizzes/${q.id}`} className="text-primary">{String(q.title)}</Link></li>)}</ul>
      </section>
      <section>
        <h2 className="font-semibold">Discussion</h2>
        <p className="mt-2 text-sm text-muted-foreground">Course-wide discussion threads are coming soon. Use study groups for text chat today.</p>
      </section>
      {data.actor.role === 'student' && courseId && (
        <CourseStudyGroups courseId={courseId} />
      )}
    </div>
  )
}
