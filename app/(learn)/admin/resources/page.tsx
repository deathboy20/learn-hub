import { redirect } from 'next/navigation'
import { AdminResourceModeration } from '@/components/workspace/lecturer-admin'
import { currentActor } from '@/lib/server/session'
import { allowed } from '@/lib/domain'

export default async function Page() {
  const actor = await currentActor().catch(() => null)
  if (!actor || !allowed(actor, 'resources.moderate')) redirect('/forbidden')
  return <AdminResourceModeration />
}
