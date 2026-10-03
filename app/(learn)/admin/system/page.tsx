import { redirect } from 'next/navigation'
import { currentActor } from '@/lib/server/session'
import { allowed } from '@/lib/domain'

export default async function AdminSystemPage() {
  const actor = await currentActor().catch(() => null)
  if (!actor || !allowed(actor, 'system.manage')) redirect('/forbidden')
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-bold">System configuration</h1>
      <p className="text-sm text-muted-foreground">Feature flags, maintenance mode, and platform metadata are managed here and in Settings.</p>
    </div>
  )
}
