import { redirect } from 'next/navigation'
import { StudentDashboard } from '@/components/workspace/student-dashboard'
import { currentActor } from '@/lib/server/session'
import { homeFor } from '@/lib/domain'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const actor = await currentActor().catch(() => null)
  if (!actor) {
    redirect(process.env.NEXT_PUBLIC_CONVEX_URL ? '/login?reason=stale' : '/login')
  }
  if (actor.role !== 'student') redirect(homeFor(actor.role))
  return <StudentDashboard />
}
