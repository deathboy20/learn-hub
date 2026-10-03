'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/client/api-fetch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/workspace/loading-state'

export default function AdminReportsPage() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiGet<Record<string, unknown>>('/api/admin/stats'),
  })
  const stats = statsQuery.data
  if (!stats) return <LoadingState />
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-sm text-muted-foreground">Operational snapshot from live platform metrics and audit activity.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{String((stats.users as { total: string }).total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Published quizzes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{String((stats.quizzes as { total: string }).total)}</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
