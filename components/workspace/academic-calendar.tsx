'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import { calendarEventStatus } from '@/lib/client/calendar-status'
import {
  addMonths,
  buildMonthGrid,
  dateKey,
  isSameDay,
  kindAccent,
  startOfDay,
  WEEKDAY_LABELS,
} from '@/lib/client/calendar-utils'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/workspace/loading-state'
import { WorkspacePageShell } from '@/components/workspace/workspace-page-shell'
import { StatCard, WorkspacePageHeader } from '@/components/workspace/workspace-page-header'
import { CalendarDayModal, type DayModalEvent } from '@/components/workspace/calendar-day-modal'
import { cn } from '@/lib/utils'

type CalendarEvent = DayModalEvent

export function AcademicCalendarPage() {
  const { data, isLoading, refetch } = useWorkspace()
  const today = useMemo(() => startOfDay(new Date()), [])
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selected, setSelected] = useState(() => new Date(today))
  const [modalDay, setModalDay] = useState<Date | null>(null)

  const events = useMemo(() => {
    if (!data) return [] as CalendarEvent[]
    return (data.events as Array<Record<string, unknown>>)
      .map(ev => ({
        id: String(ev.id),
        title: String(ev.title),
        description: ev.description != null ? String(ev.description) : '',
        kind: String(ev.kind ?? 'study'),
        starts_at: String(ev.starts_at),
        ends_at: String(ev.ends_at),
        visibility: ev.visibility != null ? String(ev.visibility) : 'private',
        status: calendarEventStatus({
          starts_at: String(ev.starts_at),
          ends_at: String(ev.ends_at),
          completed_at: ev.completed_at as string | null | undefined,
        }),
      }))
      .filter(ev => ev.status !== 'archived') as CalendarEvent[]
  }, [data])

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const key = dateKey(new Date(ev.starts_at))
      const list = map.get(key) ?? []
      list.push(ev)
      list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      map.set(key, list)
    }
    return map
  }, [events])

  const gridDays = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month])

  const monthLabel = useMemo(
    () => new Date(view.year, view.month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    [view.year, view.month],
  )

  const stats = useMemo(() => {
    const now = Date.now()
    const weekEnd = now + 7 * 24 * 60 * 60 * 1000
    let dueToday = 0
    let thisWeek = 0
    let overdue = 0
    for (const ev of events) {
      if (ev.status === 'completed') continue
      const start = new Date(ev.starts_at).getTime()
      if (ev.status === 'overdue') overdue += 1
      if (isSameDay(new Date(ev.starts_at), today)) dueToday += 1
      if (start >= now && start <= weekEnd) thisWeek += 1
    }
    return { dueToday, thisWeek, overdue }
  }, [events, today])

  const modalEvents = modalDay ? (byDay.get(dateKey(modalDay)) ?? []) : []

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter(ev => ev.status !== 'completed' && new Date(ev.ends_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 8)
  }, [events])

  if (isLoading || !data) return <LoadingState />

  function openDay(day: Date) {
    const d = startOfDay(day)
    setSelected(d)
    setModalDay(d)
  }

  function goToday() {
    setView({ year: today.getFullYear(), month: today.getMonth() })
    openDay(today)
  }

  return (
    <WorkspacePageShell className="max-w-7xl space-y-6">
      <WorkspacePageHeader
        eyebrow="Planning"
        title="Academic calendar"
        description="Select a date to view activities, add events, or edit your schedule. Completed items archive after 48 hours."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Due today" value={stats.dueToday} hint="Events starting today" />
        <StatCard label="Next 7 days" value={stats.thisWeek} hint="Upcoming schedule" />
        <StatCard label="Overdue" value={stats.overdue} hint="Needs attention" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
        <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Previous month"
                onClick={() => setView(v => addMonths(v.year, v.month, -1))}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Next month"
                onClick={() => setView(v => addMonths(v.year, v.month, 1))}
              >
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map(d => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Calendar for ${monthLabel}`}>
            {gridDays.map(day => {
              const key = dateKey(day)
              const inMonth = day.getMonth() === view.month
              const isToday = isSameDay(day, today)
              const isSelected = isSameDay(day, selected)
              const dayEvents = byDay.get(key) ?? []

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                  onClick={() => openDay(day)}
                  className={cn(
                    'flex min-h-[4.5rem] flex-col rounded-xl border border-transparent p-1.5 text-left transition-colors sm:min-h-[5.5rem] sm:p-2',
                    inMonth ? 'text-foreground' : 'text-muted-foreground/45',
                    isSelected && 'border-primary/40 bg-primary/8 shadow-sm',
                    !isSelected && 'hover:bg-muted/60',
                    isToday && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium',
                      isToday && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-auto space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map(ev => (
                      <span
                        key={ev.id}
                        className={cn(
                          'block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]',
                          kindAccent(ev.kind),
                          ev.status === 'overdue' && 'ring-1 ring-[var(--status-overdue,#b42318)]/40',
                        )}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 ? (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Coming up</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tap an item to open that day&apos;s schedule.</p>
          <ul className="mt-3 space-y-2">
            {upcoming.length === 0 ? (
              <li className="text-sm text-muted-foreground">Your schedule is clear — select a date on the grid to plan ahead.</li>
            ) : (
              upcoming.map(ev => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    onClick={() => {
                      const d = new Date(ev.starts_at)
                      setView({ year: d.getFullYear(), month: d.getMonth() })
                      openDay(d)
                    }}
                  >
                    <p className="font-medium line-clamp-1">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.starts_at).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>

      {modalDay ? (
        <CalendarDayModal
          day={modalDay}
          events={modalEvents}
          onClose={() => setModalDay(null)}
          onSaved={async () => {
            await refetch()
          }}
        />
      ) : null}
    </WorkspacePageShell>
  )
}
