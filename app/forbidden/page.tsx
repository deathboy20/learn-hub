import Link from 'next/link'
import { SiteHeader } from '@/components/public/site-header'

export const metadata = { title: 'Forbidden' }

export default function ForbiddenPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
        <Link href="/dashboard" className="mt-6 inline-block text-primary">Return to dashboard</Link>
      </div>
    </>
  )
}
