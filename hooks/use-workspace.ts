'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/client/api-fetch'
import type { ClientWorkspaceData } from '@/lib/workspace-types'

export function useWorkspace() {
  const query = useQuery({
    queryKey: ['workspace'],
    queryFn: () => apiGet<ClientWorkspaceData>('/api/workspace'),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Sign in')) return false
      return failureCount < 1
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  }
}
