/** Local calendar date key (YYYY-MM-DD). */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Default 1-hour slot on a calendar day (9:00 local, or next hour if today is already past). */
export function defaultEventSlot(day: Date): { start: Date; end: Date } {
  const base = startOfDay(day)
  const now = new Date()
  let start = new Date(base)
  start.setHours(9, 0, 0, 0)
  if (isSameDay(day, now) && start.getTime() < now.getTime()) {
    start = new Date(now)
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start, end }
}

/** Monday-first month grid (6 weeks). */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  const weekday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - weekday)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start))
    start.setDate(start.getDate() + 1)
  }
  return days
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const EVENT_KIND_LABELS: Record<string, string> = {
  study: 'Study',
  quiz: 'Quiz',
  assignment: 'Assignment',
  lecture: 'Lecture',
  deadline: 'Deadline',
}

export function kindAccent(kind: string): string {
  switch (kind) {
    case 'deadline':
      return 'bg-amber-500/20 text-amber-950 dark:text-amber-100 border-amber-500/30'
    case 'quiz':
      return 'bg-violet-500/15 text-violet-950 dark:text-violet-100 border-violet-500/25'
    case 'assignment':
      return 'bg-sky-500/15 text-sky-950 dark:text-sky-100 border-sky-500/25'
    case 'lecture':
      return 'bg-primary/15 text-primary border-primary/25'
    default:
      return 'bg-emerald-500/12 text-emerald-950 dark:text-emerald-100 border-emerald-500/25'
  }
}
