'use client'

import { Button } from '@/components/ui/button'
import { postAction } from '@/lib/client/mutate'
import { toast } from 'sonner'

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <Button onClick={async () => { await postAction('settings.save', { key: 'integrations', value: { email_enabled: true, scanning_enabled: false } }); toast.success('Saved') }}>Save integration defaults</Button>
    </div>
  )
}
