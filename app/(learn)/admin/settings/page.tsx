'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet } from '@/lib/client/api-fetch'
import { postAction } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/workspace/loading-state'
import { WorkspacePageHeader } from '@/components/workspace/workspace-page-header'

export default function AdminSettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => apiGet<{ settings: Array<{ key: string; value: Record<string, unknown> }> }>('/api/admin/roles'),
  })
  const platform = settingsQuery.data?.settings.find(s => s.key === 'platform')?.value as
    | { name?: string; support_email?: string }
    | undefined
  const [name, setName] = useState('LearnHub')
  const [supportEmail, setSupportEmail] = useState('')

  useEffect(() => {
    if (!platform) return
    if (platform.name) setName(platform.name)
    if (platform.support_email) setSupportEmail(platform.support_email)
  }, [platform])

  if (settingsQuery.isLoading) return <LoadingState />

  return (
    <form
      className="w-full max-w-6xl space-y-6"
      onSubmit={async e => {
        e.preventDefault()
        await postAction('settings.save', {
          key: 'platform',
          value: {
            name,
            official_affiliation: false,
            support_email: supportEmail,
            maintenance: false,
          },
        })
        toast.success('Platform settings saved')
      }}
    >
      <WorkspacePageHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Branding and support contact shown across the public site and workspace."
      />
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Platform name" />
      <Input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="Support email" type="email" />
      <Button type="submit">Save</Button>
    </form>
  )
}
