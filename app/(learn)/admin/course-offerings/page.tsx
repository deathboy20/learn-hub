import { redirect } from 'next/navigation'
import { CatalogManager } from '@/components/workspace/lecturer-admin'
import { currentActor } from '@/lib/server/session'
import { allowed } from '@/lib/domain'

export default async function Page() {
  const actor = await currentActor().catch(() => null)
  if (!actor || !allowed(actor, 'courses.manage')) redirect('/forbidden')
  return <CatalogManager collection='course-offerings' />
}
