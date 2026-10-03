'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet } from '@/lib/client/api-fetch'
import { postAction } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FieldGroup } from '@/components/ui/label'
import { LoadingState } from '@/components/workspace/loading-state'
import { WorkspacePageHeader } from '@/components/workspace/workspace-page-header'

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiGet<{ users: Array<Record<string, unknown>> }>('/api/admin/users'),
  })
  const user = usersQuery.data?.users.find(u => String(u.id) === id)
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')
  const [status, setStatus] = useState<'active' | 'disabled'>('active')

  useEffect(() => {
    if (!user) return
    setName(String(user.name ?? ''))
    setRole(String(user.role ?? 'student'))
    setStatus(user.status === 'disabled' ? 'disabled' : 'active')
  }, [user])

  if (usersQuery.isLoading) return <LoadingState />
  if (!user) return <p className="text-muted-foreground">User not found.</p>

  return (
    <form
      className="mx-auto max-w-lg space-y-6"
      onSubmit={async e => {
        e.preventDefault()
        try {
          await postAction('user.save', {
            id,
            name,
            role,
            status,
            programme_id: null,
            department_id: null,
            level: null,
          })
          toast.success('User updated')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Update failed')
        }
      }}
    >
      <WorkspacePageHeader eyebrow="Directory" title="Edit user" description={String(user.email)} />
      <FieldGroup label="Display name">
        <Input value={name} onChange={e => setName(e.target.value)} />
      </FieldGroup>
      <FieldGroup label="Role">
        <Select value={role} onChange={e => setRole(e.target.value)} aria-label="Role">
          {['student', 'lecturer', 'admin', 'super_admin'].map(r => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </FieldGroup>
      <FieldGroup label="Status">
        <Select value={status} onChange={e => setStatus(e.target.value as 'active' | 'disabled')} aria-label="Status">
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </Select>
      </FieldGroup>
      <Button type="submit">Save changes</Button>
    </form>
  )
}
