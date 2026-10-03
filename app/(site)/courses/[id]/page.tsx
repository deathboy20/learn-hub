import Link from 'next/link'
import { notFound } from 'next/navigation'
import { publicCourse } from '@/lib/server/queries'
import { currentActor } from '@/lib/server/session'
import { CourseDetailClient } from '@/components/workspace/course-detail-client'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const course = await publicCourse((await params).id)
    if (!course) return { title: 'Course' }
    return { title: String(course.title) }
  } catch {
    return { title: 'Course' }
  }
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const course = await publicCourse(id).catch(() => null)
  if (!course) notFound()
  const actor = await currentActor().catch(() => null)
  if (actor) return <CourseDetailClient courseId={id} />
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="text-sm text-primary">{String(course.code)}</p>
      <h1 className="text-3xl font-bold">{String(course.title)}</h1>
      <p className="mt-4 text-muted-foreground">{String(course.description)}</p>
      <p className="mt-2 text-sm">Department: {String(course.department_name)} · Level {String(course.level)}</p>
      <Link href="/login" className={cn(buttonVariants(), 'mt-8 inline-flex')}>Sign in to enroll</Link>
    </div>
  )
}
