'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@/hooks/use-workspace'
import { apiGet } from '@/lib/client/api-fetch'
import { postAction } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ComingSoonDialog } from '@/components/coming-soon-dialog'
import { LoadingState } from '@/components/workspace/loading-state'
import { progressPercent, type Role } from '@/lib/domain'
import { WorkspacePageShell } from '@/components/workspace/workspace-page-shell'
import { WorkspacePageHeader } from '@/components/workspace/workspace-page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProgressPage() {
  const { data, isLoading } = useWorkspace()
  const summaryQuery = useQuery({
    queryKey: ['progress-summary'],
    queryFn: () => apiGet<{ academicPercent: number; practiceSessions: number; practiceQuestions: number }>('/api/progress/summary'),
  })
  const summary = summaryQuery.data
  if (isLoading || !data) return <LoadingState />
  const completed = (data.progress as Array<{ completed: boolean }>).filter(p => p.completed).length
  const total = (data.progress as unknown[]).length
  const resourcePct = progressPercent(completed, Math.max(total, 1))
  return (
    <WorkspacePageShell className="space-y-8">
      <h1 className="text-2xl font-bold">Progress</h1>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Academic assessment</h2>
        <p className="text-2xl font-bold text-primary">{summary?.academicPercent ?? 0}%</p>
        <p className="text-sm text-muted-foreground">Based on formal quiz attempts in your enrolled courses.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Test Yourself practice</h2>
        <p className="text-2xl font-bold text-primary">{summary?.practiceSessions ?? 0} sessions</p>
        <p className="text-sm text-muted-foreground">{summary?.practiceQuestions ?? 0} practice questions answered.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Course resources</h2>
        <p className="text-2xl font-bold text-primary">{resourcePct}%</p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {(data.progress as Array<Record<string, unknown>>).map(p => {
            const resourceId = p.resource_id ?? p.resourceId
            const resource = (data.resources as Array<Record<string, unknown>>).find(r => String(r.id) === String(resourceId))
            const pct = Number(p.percentage ?? p.progressPercent ?? 0)
            const rowKey = String(p.id ?? resourceId ?? '')
            return (
              <li key={rowKey} className="flex justify-between p-4 text-sm">
                <span>{resource ? String(resource.title) : String(resourceId ?? 'Resource')}</span>
                <span>{pct}% {p.completed ? '✓' : ''}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </WorkspacePageShell>
  )
}

export function BookmarksPage() {
  const { data, isLoading } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  const bookmarks = data.bookmarks as Array<Record<string, unknown>>
  return (
    <WorkspacePageShell>
      <h1 className="text-2xl font-bold">Bookmarks</h1>
      <ul className="space-y-2">
        {bookmarks.map(b => (
          <li key={String(b.id)} className="rounded-lg border border-border p-3 text-sm">
            {b.resource_id ? <Link href={`/resources/${b.resource_id}`} className="text-primary">Resource bookmark</Link> : <Link href={`/courses/${b.course_id}`} className="text-primary">Course bookmark</Link>}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              title="Remove this bookmark"
              onClick={async () => {
                if (b.resource_id) await postAction('bookmark', { resource_id: b.resource_id, saved: false })
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </WorkspacePageShell>
  )
}

export function AnnouncementsPage() {
  const { data, isLoading } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  return (
    <WorkspacePageShell>
      <WorkspacePageHeader
        eyebrow="Communications"
        title="Announcements"
        description="Course and faculty updates relevant to your enrolment."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data.announcements as Array<Record<string, unknown>>).map(a => (
          <article key={String(a.id)} className="rounded-xl border border-border bg-card p-4 lg:col-span-1">
            <h2 className="font-semibold">{String(a.title)}</h2>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{String(a.body)}</p>
          </article>
        ))}
      </div>
    </WorkspacePageShell>
  )
}

export function NotificationsPage() {
  const { data, isLoading, refetch } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  return (
    <WorkspacePageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await postAction('notification.read', {})
            await refetch()
            toast.success('Notifications marked read')
          }}
        >
          Mark all read
        </Button>
      </div>
      {(data.notifications as Array<Record<string, unknown>>).map(n => (
        <Link key={String(n.id)} href={String(n.href || '/notifications')} className={`block rounded-lg border p-3 text-sm ${n.read_at ? 'opacity-60' : 'border-primary/30'}`}>
          <p className="font-medium">{String(n.title)}</p>
          <p className="text-muted-foreground">{String(n.message ?? n.body)}</p>
        </Link>
      ))}
    </WorkspacePageShell>
  )
}

export { AcademicCalendarPage as CalendarPage } from '@/components/workspace/academic-calendar'

function roleLabel(role: Role) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function platformSettingsHref(role: Role) {
  if (role === 'super_admin') return '/super-admin/settings'
  if (role === 'admin') return '/admin/settings'
  return null
}

export function ProfilePage() {
  const { data, isLoading, refetch } = useWorkspace()
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (data?.actor?.bio != null) setBio(String(data.actor.bio))
  }, [data?.actor?.bio])

  if (isLoading || !data || !data.actor) return <LoadingState />
  const actor = data.actor

  const name = actor.name
  const image = actor.image
  const email = actor.email
  const platformHref = platformSettingsHref(actor.role)

  return (
    <WorkspacePageShell>
      <WorkspacePageHeader
        eyebrow="Account"
        title="Profile & settings"
        description="Your identity in LearnHub, notification preferences, and role-specific tools."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form
          className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
          onSubmit={async e => {
            e.preventDefault()
            const displayName = String(new FormData(e.currentTarget).get('displayName') || name)
            await postAction('profile.save', {
              name: displayName,
              bio,
              level: actor.level ?? null,
              programme_id: actor.programme_id ?? null,
            })
            toast.success('Profile saved')
            await refetch()
          }}
        >
          <h2 className="text-lg font-semibold">Public profile</h2>
          <div className="flex flex-wrap items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="size-20 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="grid size-20 place-items-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <ComingSoonDialog feature="Profile photo upload" description="You can still update your name and bio">
              {open => (
                <Button type="button" variant="outline" size="sm" onClick={open}>
                  Change photo
                </Button>
              )}
            </ComingSoonDialog>
          </div>
          <label className="block text-sm font-medium">
            Display name
            <Input name="displayName" defaultValue={name} key={name} className="mt-1.5" />
          </label>
          <label className="block text-sm font-medium">
            Bio
            <Input
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Short bio for your profile"
              className="mt-1.5"
            />
          </label>
          <Button type="submit">Save profile</Button>
        </form>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Signed in as</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span> {name}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {email || 'Not set'}
              </p>
              <p>
                <span className="text-muted-foreground">Role:</span> {roleLabel(actor.role)}
              </p>
              {actor.level != null && (
                <p>
                  <span className="text-muted-foreground">Level:</span> {actor.level}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Notification and security preferences are stored with your profile record.</p>
              <p>Use the theme toggle in the header for light or dark mode.</p>
              <Link href="/notifications" className="inline-block text-sm font-medium text-primary hover:underline">
                Manage notifications →
              </Link>
            </CardContent>
          </Card>

          {platformHref && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Platform configuration</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="mb-3">Branding, support contact, and operational settings for LearnHub.</p>
                <Link href={platformHref} className="text-sm font-medium text-primary hover:underline">
                  Open platform settings →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </WorkspacePageShell>
  )
}

export function SearchPage() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const resultsQuery = useQuery({
    queryKey: ['search', q],
    queryFn: () => apiGet<Record<string, unknown>>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  })
  const results = resultsQuery.data
  return (
    <WorkspacePageShell>
      <div>
        <h1 className="text-2xl font-bold">Search results</h1>
        {!q && <p className="mt-1 text-sm text-muted-foreground">Use the search bar in the top navigation (Ctrl+K) to find courses, resources, and quizzes.</p>}
        {q && <p className="mt-1 text-sm text-muted-foreground">Showing matches for &ldquo;{q}&rdquo;</p>}
      </div>
      {q && results && (
        <div className="grid gap-4 md:grid-cols-2">
          {(['courses', 'resources', 'quizzes', 'announcements'] as const).map(key => (
            <div key={key} className="rounded-xl border border-border p-4">
              <h2 className="font-semibold capitalize">{key}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {(results[key] as Array<Record<string, unknown>>).map(item => (
                  <li key={String(item.id)}>
                    {key === 'resources' ? (
                      <Link href={`/resources/${item.id}`} className="text-primary">{String(item.title ?? item.code)}</Link>
                    ) : key === 'quizzes' ? (
                      <Link href={`/quizzes/${item.id}`} className="text-primary">{String(item.title)}</Link>
                    ) : (
                      String(item.title ?? item.code)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WorkspacePageShell>
  )
}

export function HelpPage() {
  return (
    <div className="prose prose-sm mx-auto max-w-2xl dark:prose-invert">
      <h1>Help</h1>
      <p>Use the resource library to access approved materials. Enroll in courses from My courses. Contact your lecturer for course-specific issues.</p>
    </div>
  )
}
