export type CalendarUiStatus = 'upcoming' | 'overdue' | 'completed' | 'archived'

export function calendarEventStatus(
  event: { starts_at: string; ends_at: string; completed_at?: string | null },
  nowMs = Date.now(),
): CalendarUiStatus {
  if (event.completed_at) {
    const completedAt = new Date(event.completed_at).getTime()
    if (nowMs - completedAt > 48 * 60 * 60 * 1000) return 'archived'
    return 'completed'
  }
  if (new Date(event.ends_at).getTime() < nowMs) return 'overdue'
  return 'upcoming'
}
