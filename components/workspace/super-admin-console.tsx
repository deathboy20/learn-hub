'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet } from '@/lib/client/api-fetch'
import { postAction } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FieldGroup, Label } from '@/components/ui/label'
import { LoadingState, EmptyState } from '@/components/workspace/loading-state'
import { WorkspacePageHeader, StatusBadge } from '@/components/workspace/workspace-page-header'
import { useConfirm } from '@/components/confirm-dialog'
import { AdminDashboard } from '@/components/workspace/lecturer-admin'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export function SuperAdminDashboard() {
  return <AdminDashboard />
}

export function SuperAdminUsersPanel({ userLinkPrefix = '/super-admin/users' }: { userLinkPrefix?: string }) {
  const confirm = useConfirm()
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiGet<{ users: UserRow[] }>('/api/admin/users'),
  })
  const users = usersQuery.data?.users ?? []
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftRole, setDraftRole] = useState('student')
  const [draftStatus, setDraftStatus] = useState<'active' | 'disabled'>('active')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }, [users, search])

  function startEdit(u: UserRow) {
    setEditing(u)
    setDraftName(u.name ?? '')
    setDraftRole(u.role ?? 'student')
    setDraftStatus((u.status === 'disabled' ? 'disabled' : 'active') as 'active' | 'disabled')
  }

  async function saveEdit() {
    if (!editing) return
    try {
      await postAction('user.save', {
        id: editing.id,
        name: draftName,
        role: draftRole,
        status: draftStatus,
        programme_id: null,
        department_id: null,
        level: null,
      })
      await usersQuery.refetch()
      toast.success('User updated')
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function deleteUser() {
    if (!editing) return
    const ok = await confirm({
      title: 'Delete user account',
      description: `Permanently delete ${editing.email}? This removes their LearnHub account record and cannot be undone.`,
      confirmLabel: 'Delete user',
      destructive: true,
    })
    if (!ok) return
    try {
      await postAction('user.delete', { id: editing.id })
      await usersQuery.refetch()
      toast.success('User deleted')
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (usersQuery.isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Directory"
        title="Users"
        description="Search accounts, adjust roles, and disable access when required. New accounts are created through sign-up."
      />
      <Input placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="workspace-table w-full text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-border/60 hover:bg-muted/20">
                <td className="p-3 font-medium">{u.name || '—'}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3 capitalize">{String(u.role).replace('_', ' ')}</td>
                <td className="p-3">
                  <StatusBadge status={String(u.status ?? 'active')} />
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8">
            <EmptyState title="No users match" description="Try a different search term." />
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Edit user</h2>
            <p className="text-xs text-muted-foreground">{userLinkPrefix} · {editing.email}</p>
            <FieldGroup label="Display name">
              <Input value={draftName} onChange={e => setDraftName(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Role">
              <Select value={draftRole} onChange={e => setDraftRole(e.target.value)} aria-label="User role">
                {['student', 'lecturer', 'admin', 'super_admin'].map(r => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Account status">
              <Select
                value={draftStatus}
                onChange={e => setDraftStatus(e.target.value as 'active' | 'disabled')}
                aria-label="Account status"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </FieldGroup>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button variant="destructive" onClick={() => void deleteUser()}>
                Delete user
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveEdit()}>Save changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SuperAdminRolesPanel() {
  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () =>
      apiGet<{
        roles: Array<{ name: string; description: string }>
        rolePermissions: Array<{ role: string; permission_key: string }>
      }>('/api/admin/roles'),
  })
  const roles = useMemo(() => {
    const data = rolesQuery.data
    if (!data) return []
    return data.roles.map(r => ({
      ...r,
      permissions: data.rolePermissions.filter(rp => rp.role === r.name).map(rp => rp.permission_key),
    }))
  }, [rolesQuery.data])
  if (rolesQuery.isLoading) return <LoadingState />
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Access control"
        title="Roles & permissions"
        description="Role templates define what each persona can do across LearnHub. Assign roles from the Users screen."
      />
      <ul className="space-y-4">
        {roles.map(r => (
          <li key={r.name} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold capitalize">{r.name.replace('_', ' ')}</h2>
              <span className="text-xs text-muted-foreground">{r.permissions.length} permissions</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {r.permissions.map(p => (
                <span key={p} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SuperAdminAuditPanel() {
  const logsQuery = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => apiGet<{ logs: Array<Record<string, unknown>> }>('/api/admin/audit'),
  })
  const logs = logsQuery.data?.logs
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    if (!logs) return []
    const q = filter.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(l => JSON.stringify(l).toLowerCase().includes(q))
  }, [logs, filter])

  if (logsQuery.isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Security"
        title="Audit log"
        description="Immutable record of administrative actions for compliance and troubleshooting."
      />
      <Input placeholder="Filter actions…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-md" />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="workspace-table w-full text-left text-sm">
          <thead className="border-b text-xs uppercase">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={String(l.id)} className="border-b border-border/60">
                <td className="p-3 whitespace-nowrap text-muted-foreground">{String(l.created_at)}</td>
                <td className="p-3">{String(l.actor_name)}</td>
                <td className="p-3 font-medium">{String(l.action)}</td>
                <td className="p-3 text-muted-foreground">
                  {String(l.target)}/{String(l.target_id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8">
            <EmptyState title="No audit entries" description="Actions will appear here as admins make changes." />
          </div>
        )}
      </div>
    </div>
  )
}

export function SuperAdminSettingsPanel() {
  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => apiGet<{ settings: Array<{ key: string; value: Record<string, unknown> }> }>('/api/admin/roles'),
  })
  const [platformName, setPlatformName] = useState('LearnHub')
  const [supportEmail, setSupportEmail] = useState('')

  const platformValue = rolesQuery.data?.settings.find(s => s.key === 'platform')?.value as
    | { name?: string; support_email?: string }
    | undefined

  if (rolesQuery.isLoading) return <LoadingState />

  return (
    <div className="w-full max-w-6xl space-y-8">
      <WorkspacePageHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Global options stored in Postgres. API secrets remain in deployment environment variables only."
      />
      <form
        className="space-y-3 rounded-xl border border-border bg-card p-5"
        onSubmit={async e => {
          e.preventDefault()
          try {
            await postAction('settings.save', {
              key: 'platform',
              value: {
                name: platformName,
                official_affiliation: platformValue?.name ? false : false,
                support_email: supportEmail,
                maintenance: false,
              },
            })
            toast.success('Platform settings saved')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed')
          }
        }}
      >
        <h2 className="font-semibold">Branding</h2>
        <Input placeholder="Platform name" value={platformName} onChange={e => setPlatformName(e.target.value)} />
        <Input placeholder="Support email" type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
        {platformValue?.name ? <p className="text-xs text-muted-foreground">Current stored name: {platformValue.name}</p> : null}
        <Button type="submit">Save branding</Button>
      </form>
    </div>
  )
}

export function SuperAdminAIPanel() {
  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => apiGet<{ settings: Array<{ key: string; value: Record<string, unknown> }> }>('/api/admin/roles'),
  })
  const aiValue = rolesQuery.data?.settings.find(s => s.key === 'ai')?.value as Record<string, unknown> | undefined
  const [enabled, setEnabled] = useState(true)
  const [model, setModel] = useState('qwen/qwen3.8-27b')

  if (rolesQuery.isLoading) return <LoadingState />

  return (
    <div className="w-full max-w-6xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Assistant"
        title="AI configuration"
        description="Control model selection and feature access. Set GROQ_API_KEY and AI_PROVIDER in your deployment environment."
      />
      <form
        className="space-y-4 rounded-xl border border-border bg-card p-5"
        onSubmit={async e => {
          e.preventDefault()
          try {
            await postAction('settings.save', {
              key: 'ai',
              value: {
                enabled,
                provider: String(aiValue?.provider ?? process.env.AI_PROVIDER ?? 'openrouter'),
                model,
                student_access: aiValue?.student_access ?? true,
                lecturer_access: aiValue?.lecturer_access ?? true,
                allow_private_materials: aiValue?.allow_private_materials ?? false,
                daily_limit: 10,
                max_tokens: Number(aiValue?.max_tokens ?? 1500),
                temperature: Number(aiValue?.temperature ?? 0.4),
              },
            })
            toast.success('AI settings saved')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed')
          }
        }}
      >
        <Label className="flex items-center gap-2 font-normal">
          <input type="checkbox" className="size-4 rounded border-input accent-primary" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          Enable academic assistant for authorized roles
        </Label>
        <FieldGroup label="Model">
          <Input value={model} onChange={e => setModel(e.target.value)} />
        </FieldGroup>
        <p className="text-xs text-muted-foreground">
          End users have a lifetime cap of 10 AI messages per account (enforced in Postgres).
        </p>
        <Button type="submit">Save AI settings</Button>
      </form>
    </div>
  )
}
