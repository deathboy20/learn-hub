'use client'

import { withActionBusy } from '@/lib/client/action-busy'

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' })
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Request failed.')
  return body as T
}

export async function apiPost<T>(path: string, payload: unknown, busyLabel = 'Processing…'): Promise<T> {
  return withActionBusy(busyLabel, async () => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Request failed.')
    return body as T
  })
}
