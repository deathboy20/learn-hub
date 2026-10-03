'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { postAction } from '@/lib/client/mutate'

export default function AdminPermissionsPage() {
  const [data, setData] = useState<{ permissions: Array<{ key: string }>; rolePermissions: Array<{ role: string; permission_key: string }> } | null>(null)
  useEffect(() => { void fetch('/api/admin/roles').then(r => r.json()).then(setData) }, [])
  if (!data) return <p>Loading…</p>
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Permissions</h1>
      <p className="text-sm text-muted-foreground">Adjust lecturer role permissions (super admin only).</p>
      <Button onClick={async () => {
        await postAction('permissions.save', { role: 'lecturer', permissions: ['courses.read', 'resources.read', 'resources.write', 'quizzes.write', 'announcements.manage', 'analytics.read', 'ai.use'] })
        toast.success('Lecturer permissions updated')
      }}>Reset lecturer permissions</Button>
      <ul className="text-sm">{data.permissions.map(p => <li key={p.key}>{p.key}</li>)}</ul>
    </div>
  )
}
