import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/workspace/lecturer-admin'
import { currentActor } from '@/lib/server/session'

export default async function SuperAdminDashboardPage() {
  const actor = await currentActor().catch(() => null)
  if (!actor || actor.role !== 'super_admin') redirect('/forbidden')
  return <AdminDashboard />
}
