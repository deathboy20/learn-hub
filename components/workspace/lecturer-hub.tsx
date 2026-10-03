'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { postAction } from '@/lib/client/mutate'
import { postQuiz } from '@/lib/client/mutate'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState, EmptyState } from '@/components/workspace/loading-state'
import { WorkspacePageHeader, StatCard, StatusBadge } from '@/components/workspace/workspace-page-header'
import { useConfirm } from '@/components/confirm-dialog'

function useLecturerScope() {
  const { data, isLoading, refetch } = useWorkspace()
  const actorId = data?.actor.id
  const offerings = useMemo(
    () =>
      ((data?.offerings ?? []) as Array<Record<string, unknown>>).filter(o => String(o.lecturer_id) === String(actorId)),
    [data?.offerings, actorId],
  )
  const resources = useMemo(
    () =>
      ((data?.resources ?? []) as Array<Record<string, unknown>>).filter(r => String(r.uploaded_by) === String(actorId)),
    [data?.resources, actorId],
  )
  const courseIds = useMemo(() => new Set(offerings.map(o => String(o.course_id))), [offerings])
  const quizzes = useMemo(
    () =>
      ((data?.quizzes ?? []) as Array<Record<string, unknown>>).filter(q =>
        courseIds.has(String(q.course_id)),
      ),
    [data?.quizzes, courseIds],
  )
  const announcements = useMemo(
    () => ((data?.announcements ?? []) as Array<Record<string, unknown>>),
    [data?.announcements],
  )
  return { data, isLoading, refetch, offerings, resources, quizzes, announcements, actorId }
}

export function LecturerCoursesHub() {
  const { isLoading, offerings } = useLecturerScope()
  if (isLoading) return <LoadingState />
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspacePageHeader
        eyebrow="Teaching"
        title="My courses"
        description="Courses assigned to you this term. Open a course hub to manage materials and assessments."
        actions={
          <Link href="/lecturer/dashboard" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Dashboard
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerings.map(o => (
          <Card key={String(o.id)} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold leading-snug">{String(o.title)}</CardTitle>
              <p className="text-xs font-medium text-primary">{String(o.code)}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{String(o.term_name ?? 'Current term')}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{String(o.enrolled_count ?? 0)}</span> students enrolled
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/lecturer/courses/${String(o.course_id)}`} className={cn(buttonVariants({ size: 'sm' }))}>
                  Course hub
                </Link>
                <Link href="/lecturer/resources/upload" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
                  Upload
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {offerings.length === 0 && (
        <EmptyState title="No assigned courses" description="When registry assigns you to an offering, it will appear here." />
      )}
    </div>
  )
}

export function LecturerResourcesHub() {
  const { isLoading, resources } = useLecturerScope()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const filtered = useMemo(() => {
    let list = resources
    if (status !== 'all') list = list.filter(r => String(r.moderation_status) === status)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(r => String(r.title).toLowerCase().includes(q))
    }
    return list
  }, [resources, query, status])
  if (isLoading) return <LoadingState />
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Materials"
        title="Resources"
        description="Track uploads, moderation status, and visibility for your teaching materials."
        actions={
          <Link href="/lecturer/resources/upload" className={cn(buttonVariants({ size: 'sm' }))}>
            Upload new
          </Link>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by title…" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
        <Select
          className="max-w-[200px]"
          value={status}
          onChange={e => setStatus(e.target.value)}
          aria-label="Filter by moderation status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="workspace-table w-full text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Course</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={String(r.id)} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-medium">{String(r.title)}</td>
                <td className="p-3 text-muted-foreground">{String(r.code ?? '—')}</td>
                <td className="p-3">
                  <StatusBadge status={String(r.moderation_status ?? 'pending')} />
                </td>
                <td className="p-3 capitalize text-muted-foreground">{String(r.type)}</td>
                <td className="p-3 text-right">
                  <Link href={`/resources/${String(r.id)}`} className="text-primary text-xs font-medium hover:underline">
                    Preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8">
            <EmptyState title="No resources" description="Upload lecture notes or slides to get started." />
          </div>
        )}
      </div>
    </div>
  )
}

export function LecturerUploadHub() {
  const { data, offerings } = useLecturerScope()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [category, setCategory] = useState('Lecture Notes')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId || !title.trim()) return
    setPending(true)
    try {
      await postAction('resource.draft', {
        course_id: courseId,
        title: title.trim(),
        description: '',
        category,
      })
      toast.success('Draft saved — file upload will attach when available')
      setTitle('')
      setFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save draft')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Publishing"
        title="Upload resource"
        description="Files are scanned and reviewed before students can access them."
      />
      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm lg:grid-cols-2">
        <FieldGroup label="Course">
          <Select value={courseId} onChange={e => setCourseId(e.target.value)} required aria-label="Course">
            <option value="">Select course</option>
            {offerings.map(c => (
              <option key={String(c.id)} value={String(c.course_id)}>
                {String(c.code)}: {String(c.title)}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Title">
          <Input placeholder="e.g. Week 3 — Intro to algorithms" value={title} onChange={e => setTitle(e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Category">
          <Select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            {['Lecture Notes', 'Slides', 'Past Questions', 'Reading', 'Video'].map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="File" hint="Optional for now — draft metadata is saved to the database">
          <input
            type="file"
            className="block w-full text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </FieldGroup>
        <div className="lg:col-span-2">
          <Button type="submit" disabled={pending || !data || !courseId || !title.trim()}>
            {pending ? 'Saving…' : 'Save draft resource'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function LecturerQuizzesHub() {
  const { isLoading, quizzes, offerings, refetch } = useLecturerScope()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [pending, setPending] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId || !title.trim()) return
    setPending(true)
    try {
      await postQuiz(
        {
          course_id: courseId,
          title: title.trim(),
          description: '',
          time_limit: 30,
          max_attempts: 3,
          status: 'draft',
          allow_review: true,
          available_from: null,
          available_until: null,
          questions: [
            {
              prompt: 'Sample question — edit after creation',
              type: 'multiple_choice',
              points: 1,
              options: ['Option A', 'Option B'],
              answer: 'Option A',
              explanation: '',
            },
          ],
        },
        true,
      )
      toast.success('Draft quiz created')
      setOpen(false)
      setTitle('')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create quiz')
    } finally {
      setPending(false)
    }
  }

  if (isLoading) return <LoadingState />
  const mine = quizzes

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Assessment"
        title="Quizzes"
        description="Create drafts, publish when ready, and monitor student attempts."
        actions={
          <Button size="sm" onClick={() => setOpen(v => !v)}>
            {open ? 'Close form' : 'New quiz'}
          </Button>
        }
      />
      {open && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <Input placeholder="Quiz title" value={title} onChange={e => setTitle(e.target.value)} required />
          <Select value={courseId} onChange={e => setCourseId(e.target.value)} required aria-label="Course for quiz">
            <option value="">Course</option>
            {offerings.map(c => (
              <option key={String(c.id)} value={String(c.course_id)}>
                {String(c.code)}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={pending}>
            Create draft
          </Button>
        </form>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="workspace-table w-full text-left text-sm">
          <thead className="border-b text-xs uppercase">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Course</th>
              <th className="p-3">Status</th>
              <th className="p-3">Time</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {mine.map(q => (
              <tr key={String(q.id)} className="border-b border-border/60">
                <td className="p-3 font-medium">{String(q.title)}</td>
                <td className="p-3 text-muted-foreground">{String(q.code ?? '—')}</td>
                <td className="p-3">
                  <StatusBadge status={String(q.status ?? (q.published ? 'published' : 'draft'))} />
                </td>
                <td className="p-3 text-muted-foreground">{String(q.time_limit ?? 30)} min</td>
                <td className="p-3 text-right space-x-2">
                  <Link href={`/quizzes/${String(q.id)}`} className="text-xs font-medium text-primary">
                    Open
                  </Link>
                  {String(q.status) !== 'published' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await postQuiz(
                          {
                            id: q.id,
                            course_id: q.course_id,
                            title: q.title,
                            description: q.description ?? '',
                            time_limit: q.time_limit ?? 30,
                            max_attempts: q.max_attempts ?? 3,
                            status: 'published',
                            allow_review: q.allow_review ?? true,
                            available_from: q.available_from ?? null,
                            available_until: q.available_until ?? null,
                            questions: [
                              {
                                prompt: 'Published placeholder — edit in quiz builder',
                                type: 'true_false',
                                points: 1,
                                options: ['True', 'False'],
                                answer: 'True',
                                explanation: '',
                              },
                            ],
                          },
                          true,
                        )
                        toast.success('Published')
                        await refetch()
                      }}
                    >
                      Publish
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mine.length === 0 && (
          <div className="p-8">
            <EmptyState title="No quizzes yet" description="Create a draft quiz for one of your courses." />
          </div>
        )}
      </div>
    </div>
  )
}

export function LecturerAnnouncementsHub() {
  const { isLoading, announcements, offerings, refetch, actorId } = useLecturerScope()
  const confirm = useConfirm()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [courseId, setCourseId] = useState('')

  const mine = useMemo(
    () => announcements.filter(a => String(a.createdBy ?? a.created_by) === String(actorId) || !a.courseId),
    [announcements, actorId],
  )

  if (isLoading) return <LoadingState />

  return (
    <div className="w-full max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Communications"
        title="Announcements"
        description="Post timely updates to students enrolled in your courses."
      />
      <form
        className="space-y-3 rounded-xl border border-border bg-card p-4"
        onSubmit={async e => {
          e.preventDefault()
          if (!courseId) {
            toast.error('Select a course for this announcement')
            return
          }
          try {
            await postAction('announcement.save', {
              title,
              body,
              course_id: courseId,
              programme_id: null,
              department_id: null,
              level: null,
              status: 'published',
              publish_at: null,
            })
            toast.success('Announcement posted')
            setTitle('')
            setBody('')
            await refetch()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to post')
          }
        }}
      >
        <FieldGroup label="Headline">
          <Input placeholder="Headline" value={title} onChange={e => setTitle(e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Audience">
          <Select value={courseId} onChange={e => setCourseId(e.target.value)} required aria-label="Announcement audience">
            <option value="">Select course</option>
            {offerings.map(c => (
              <option key={String(c.id)} value={String(c.course_id)}>
                {String(c.code)} — {String(c.title)}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Message">
          <Textarea placeholder="Message to students…" value={body} onChange={e => setBody(e.target.value)} required />
        </FieldGroup>
        <Button type="submit">Publish announcement</Button>
      </form>
      <ul className="space-y-3">
        {mine.map(a => (
          <li key={String(a.id)} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{String(a.title)}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{String(a.body ?? a.content)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await postAction('announcement.save', {
                      id: a.id,
                      title: a.title,
                      body: a.body ?? a.content,
                      course_id: a.course_id ?? a.courseId ?? null,
                      programme_id: null,
                      department_id: null,
                      level: null,
                      status: 'draft',
                      publish_at: null,
                    })
                    toast.success('Unpublished')
                    await refetch()
                  }}
                >
                  Unpublish
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete announcement',
                      description: 'Delete this announcement permanently? Enrolled students will no longer see it.',
                      confirmLabel: 'Delete',
                      destructive: true,
                    })
                    if (!ok) return
                    await postAction('announcement.delete', { id: a.id })
                    toast.success('Deleted')
                    await refetch()
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LecturerAnalyticsHub() {
  const { isLoading, resources, data } = useLecturerScope()
  if (isLoading || !data) return <LoadingState />
  const views = resources.reduce((s, r) => s + Number(r.view_count ?? 0), 0)
  const downloads = resources.reduce((s, r) => s + Number(r.download_count ?? 0), 0)
  const attempts = (data.attempts as unknown[]).length
  const pending = resources.filter(r => r.moderation_status === 'pending').length
  const approved = resources.filter(r => r.moderation_status === 'approved').length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspacePageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Engagement signals from your uploads and quiz activity across assigned courses."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Resource views" value={views} hint="Across approved materials" />
        <StatCard label="Downloads" value={downloads} />
        <StatCard label="Quiz attempts" value={attempts} hint="All courses" />
        <StatCard label="Pending uploads" value={pending} hint={`${approved} approved`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top materials</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {resources.slice(0, 8).map(r => (
              <li key={String(r.id)} className="flex justify-between py-2">
                <span>{String(r.title)}</span>
                <span className="text-muted-foreground">{Number(r.view_count ?? 0)} views</span>
              </li>
            ))}
            {resources.length === 0 && <li className="py-4 text-muted-foreground">No upload data yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
