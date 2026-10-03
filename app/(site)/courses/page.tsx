import Link from 'next/link'
import { publicCatalogue } from '@/lib/server/queries'

export const metadata = { title: 'Courses' }

export default async function CoursesPage() {
  const { courses } = await publicCatalogue().catch(() => ({ courses: [] as Awaited<ReturnType<typeof publicCatalogue>>['courses'] }))
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <h1 className="text-3xl font-bold">Course catalogue</h1>
      <p className="mt-2 text-sm text-muted-foreground">{courses.length} active courses available for browsing.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map(c => (
          <li key={String(c.id)} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-primary">{String(c.code)}</p>
            <h2 className="font-semibold">{String(c.title)}</h2>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{String(c.description)}</p>
            <Link href={`/courses/${c.id}`} className="mt-3 inline-block text-sm text-primary">Details →</Link>
          </li>
        ))}
        {courses.length === 0 && (
          <li className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No courses are published yet. Run seed on your Convex deployment or sign in as an administrator to add catalogue data.
          </li>
        )}
      </ul>
    </div>
  )
}
