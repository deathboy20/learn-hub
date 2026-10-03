import Link from 'next/link'
import { BookOpen, GraduationCap, LineChart, PlayCircle, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { publicCatalogue } from '@/lib/server/queries'
import { siteConfig } from '@/lib/site'

export const revalidate = 300

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
}

export default async function LandingPage() {
  const catalogue = await publicCatalogue().catch(() => ({
    courses: [],
    programmes: [],
    featured: [],
    stats: { programmeCount: 0, activeCourseCount: 0, offeringCount: 0 },
  }))
  const { courses, programmes, featured: featuredFromApi, stats } = catalogue
  const featured = (featuredFromApi?.length ? featuredFromApi : courses).slice(0, 6)
  const programmeCount = stats?.programmeCount ?? programmes.length
  const courseCount = stats?.activeCourseCount ?? courses.length

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Academic learning workspace</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Learn with clarity on LearnHub
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Discover courses, access approved lecture materials, practice with quizzes, track progress, and collaborate with lecturers in one secure platform built for university study.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 motion-safe:animate-enter">
              <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>Create student account</Link>
              <Link href="/courses" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>Browse courses</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BookOpen, title: 'Resource library', text: 'PDFs, videos, past questions, and tutorials with moderation.' },
              { icon: PlayCircle, title: 'Video learning', text: 'Stream with resume tracking and completion progress.' },
              { icon: LineChart, title: 'Progress insights', text: 'Dashboards for courses, quizzes, and weekly activity.' },
              { icon: Sparkles, title: 'AI assistant', text: 'Authorized academic help grounded in your course materials.' },
            ].map((item, index) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5 shadow-sm motion-safe:animate-enter" style={{ animationDelay: `${index * 60}ms` }}>
                <item.icon className="size-8 text-primary" aria-hidden />
                <h2 className="mt-3 font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Featured courses</h2>
            <p className="text-sm text-muted-foreground">{programmeCount} programmes · {courseCount} active courses this term</p>
          </div>
          <Link href="/courses" className="text-sm font-medium text-primary">View all</Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(course => (
            <li key={String(course.id)} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold text-primary">{String(course.code)}</p>
              <h3 className="mt-1 font-semibold">{String(course.title)}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{String(course.description || 'Course description')}</p>
              <Link href={`/courses/${course.id}`} className="mt-4 inline-block text-sm font-medium text-primary">
                Course details →
              </Link>
            </li>
          ))}
          {featured.length === 0 && (
            <li className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Course catalogue will appear here once published by your institution.
            </li>
          )}
        </ul>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="size-10 text-primary" aria-hidden />
            <div>
              <h2 className="text-xl font-bold">For lecturers and administrators</h2>
              <p className="text-sm text-muted-foreground">Upload materials, moderate resources, manage programmes, and view analytics.</p>
            </div>
          </div>
          <Link href="/login" className={cn(buttonVariants())}>Sign in to workspace</Link>
        </div>
      </section>
    </>
  )
}
