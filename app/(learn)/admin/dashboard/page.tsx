import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/workspace/lecturer-admin'
import { currentActor } from '@/lib/server/session'
import { allowed } from '@/lib/domain'

export default async function Page() {
  const actor = await currentActor().catch(() => null)
  if (!actor || (!allowed(actor, 'courses.manage') && actor.role !== 'admin' && actor.role !== 'super_admin')) redirect('/forbidden')
  return <AdminDashboard />
}
