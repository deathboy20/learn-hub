'use client'

import { withActionBusy } from '@/lib/client/action-busy'

function actionLabel(action: string) {
  const map: Record<string, string> = {
    'catalog.save': 'Saving catalogue record…',
    'catalog.delete': 'Deleting record…',
    'announcement.save': 'Saving announcement…',
    'announcement.delete': 'Deleting announcement…',
    'resource.moderate': 'Updating resource…',
    'resource.delete': 'Deleting resource…',
    'resource.draft': 'Saving draft…',
    'user.save': 'Updating user…',
    'user.delete': 'Deleting user…',
    'profile.save': 'Saving profile…',
    enroll: 'Enrolling…',
  }
  return map[action] ?? 'Saving changes…'
}

export async function postAction<T = unknown>(action: string, data: Record<string, unknown> = {}) {
  return withActionBusy(actionLabel(action), async () => {
    const response = await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Request failed.')
    return body as T
  })
}

export async function postQuiz<T = unknown>(payload: Record<string, unknown>, author = false) {
  return withActionBusy('Saving quiz…', async () => {
    const response = await fetch(`/api/quizzes${author ? '?mode=author' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Quiz request failed.')
    return body as T
  })
}
