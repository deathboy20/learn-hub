'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/client/api-fetch'
import { postAction } from '@/lib/client/mutate'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { inferResourceType } from '@/lib/infer-resource-type'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/workspace/loading-state'
import { WorkspacePageHeader, StatCard } from '@/components/workspace/workspace-page-header'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { catalogs } from '@/lib/catalog'
import type { Catalog } from '@/lib/catalog'
import { useConfirm } from '@/components/confirm-dialog'

export function LecturerDashboard() {
  const { data, isLoading } = useWorkspace()
  if (isLoading || !data) return <LoadingState />
  const mine = (data.resources as Array<Record<string, unknown>>).filter(r => String(r.uploaded_by) === data.actor.id)
  const pending = mine.filter(r => r.moderation_status === 'pending').length
  const offerings = (data.offerings as Array<Record<string, unknown>>).filter(o => String(o.lecturer_id) === data.actor.id)
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspacePageHeader
        eyebrow="Teaching workspace"
        title="Dashboard"
        description="Overview of your courses, uploads, and assessments for this term."
        actions={
          <Link href="/lecturer/resources/upload" className={cn(buttonVariants({ size: 'sm' }))}>
            Upload material
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={offerings.length} />
        <StatCard label="Resources" value={mine.length} />
        <StatCard label="Pending review" value={pending} hint="Awaiting moderation" />
        <StatCard label="Quizzes" value={(data.quizzes as unknown[]).length} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/lecturer/courses', label: 'My courses', desc: 'Open course hubs' },
          { href: '/lecturer/resources', label: 'Resources', desc: 'Manage uploads' },
          { href: '/lecturer/quizzes', label: 'Quizzes', desc: 'Drafts and publishing' },
          { href: '/lecturer/announcements', label: 'Announcements', desc: 'Message students' },
          { href: '/lecturer/analytics', label: 'Analytics', desc: 'Engagement insights' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
            <p className="font-semibold text-primary">{item.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function LecturerUpload() {
  const { data } = useWorkspace()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [pending, setPending] = useState(false)
  const courses = (data?.offerings as Array<Record<string, unknown>> | undefined)?.filter(o => String(o.lecturer_id) === data?.actor.id) ?? []

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId || !title.trim()) return
    setPending(true)
    try {
      await postAction('resource.draft', {
        course_id: courseId,
        title: title.trim(),
        description: '',
        category: 'Lecture Notes',
      })
      toast.success('Draft resource saved')
      setTitle('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">Upload resource</h1>
      <Select value={courseId} onChange={e => setCourseId(e.target.value)} required aria-label="Course">
        <option value="">Select course offering course</option>
        {courses.map(c => <option key={String(c.id)} value={String(c.course_id)}>{String(c.code)}: {String(c.title)}</option>)}
      </Select>
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <Button type="submit" disabled={pending || !courseId || !title.trim()}>{pending ? 'Saving…' : 'Save draft resource'}</Button>
    </form>
  )
}

export function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiGet<Record<string, unknown>>('/api/admin/stats'),
  })
  const stats = statsQuery.data
  if (!stats) return <LoadingState />
  const users = stats.users as Record<string, string>
  const resources = stats.resources as Record<string, string>
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspacePageHeader
        eyebrow="Operations"
        title="Admin dashboard"
        description="Platform health, moderation queue, and enrolment activity."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={users.total} hint={`${users.students} students · ${users.lecturers} lecturers`} />
        <StatCard label="Pending resources" value={resources.pending} />
        <StatCard label="Enrollments" value={(stats.enrollments as { total: string }).total} />
        <StatCard label="Published quizzes" value={(stats.quizzes as { total: string }).total} />
      </div>
    </div>
  )
}

export function AdminResourceModeration() {
  const { data, isLoading, refetch } = useWorkspace()
  const confirm = useConfirm()
  const [tab, setTab] = useState('pending')
  if (isLoading || !data) return <LoadingState />
  const all = data.resources as Array<Record<string, unknown>>
  const list = tab === 'all' ? all : all.filter(r => r.moderation_status === tab)

  async function removeResource(id: string) {
    const ok = await confirm({
      title: 'Delete resource',
      description: 'Permanently delete this resource record? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await postAction('resource.delete', { id })
      toast.success('Resource deleted')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">Resource moderation</h1>
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'approved', 'rejected', 'correction_required'].map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>{t.replaceAll('_', ' ')}</Button>
        ))}
      </div>
      <ul className="space-y-3">
        {list.map(r => (
          <li key={String(r.id)} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div><p className="font-medium">{String(r.title)}</p><p className="text-xs text-muted-foreground">{String(r.moderation_status)} · {String(r.uploader_name)}</p></div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/resources/${String(r.id)}`} className="text-sm text-primary">Preview</Link>
                <Button size="sm" onClick={async () => { await postAction('resource.moderate', { id: r.id, status: 'approved', notes: '' }); toast.success('Approved'); await refetch() }}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={async () => { await postAction('resource.moderate', { id: r.id, status: 'rejected', notes: 'Rejected by moderator' }); toast.success('Rejected'); await refetch() }}>Reject</Button>
                {['rejected', 'archived', 'draft', 'correction_required'].includes(String(r.moderation_status)) && (
                  <Button size="sm" variant="outline" onClick={() => void removeResource(String(r.id))}>Delete</Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CatalogManager({ collection }: { collection: keyof typeof catalogs }) {
  const config = catalogs[collection] as Catalog
  const { data, refetch } = useWorkspace()
  const confirm = useConfirm()
  const [values, setValues] = useState<Record<string, string>>({})
  const keyMap: Record<string, string> = { 'course-offerings': 'offerings', terms: 'terms', levels: 'levels' }
  const rows = (data?.[(keyMap[collection] ?? collection) as keyof typeof data] as Array<Record<string, unknown>> | undefined) ?? []

  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await postAction('catalog.save', { collection, values })
      toast.success('Saved')
      setValues({})
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete catalogue record',
      description:
        'Permanently delete this record? Remove linked offerings or resources first if deletion is blocked.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await postAction('catalog.delete', { collection, id })
      toast.success('Deleted')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{config.title}</h1>
      <form onSubmit={save} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2 lg:grid-cols-3">
        {config.fields.map(field => (
          <label key={field.key} className="text-sm font-medium text-foreground">{field.label}
            {field.type === 'textarea' ? (
              <Textarea className="mt-1" value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} required={field.required} />
            ) : field.type === 'select' ? (
              <Select className="mt-1" value={values[field.key] ?? 'active'} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} aria-label={field.label}>
                {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : (
              <Input className="mt-1" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} required={field.required} />
            )}
          </label>
        ))}
        <Button type="submit" className="md:col-span-2 lg:col-span-3">Create record</Button>
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border text-sm">
        {rows.slice(0, 50).map(row => (
          <li key={String(row.id)} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              {String(row.name ?? row.title ?? row.code ?? row.id)}
              {row.status != null ? <span className="ml-2 text-xs text-muted-foreground">({String(row.status)})</span> : null}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => void remove(String(row.id))}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminAnnouncementsPanel() {
  const { data, isLoading, refetch } = useWorkspace()
  const confirm = useConfirm()
  if (isLoading || !data) return <LoadingState />
  const items = data.announcements as Array<Record<string, unknown>>

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Delete announcement',
      description: 'Delete this announcement permanently? Students will no longer see it.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await postAction('announcement.delete', { id })
      toast.success('Announcement deleted')
      await refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="w-full max-w-6xl space-y-4">
      <WorkspacePageHeader
        eyebrow="Communications"
        title="Announcements"
        description="Review and remove outdated or rejected notices. Deletions are permanent."
      />
      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map(a => (
          <li key={String(a.id)} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{String(a.title)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{String(a.status ?? 'published')}</p>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{String(a.body)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void remove(String(a.id))}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminUsers() {
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiGet<{ users: Array<Record<string, unknown>> }>('/api/admin/users'),
  })
  const users = usersQuery.data?.users ?? []
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={String(u.id)} className="border-b border-border/60">
              <td className="p-2"><Link href={`/admin/users/${u.id}`} className="text-primary">{String(u.name)}</Link></td>
              <td>{String(u.email)}</td>
              <td>{String(u.role)}</td>
              <td>{String(u.status ?? 'active')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
