'use client'

import { useEffect, useId, useState } from 'react'
import { CalendarDays, Clock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/confirm-dialog'
import { postAction } from '@/lib/client/mutate'
import type { CalendarUiStatus } from '@/lib/client/calendar-status'
import {
  defaultEventSlot,
  EVENT_KIND_LABELS,
  kindAccent,
  toDatetimeLocalValue,
} from '@/lib/client/calendar-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type DayModalEvent = {
  id: string
  title: string
  description?: string
  kind: string
  starts_at: string
  ends_at: string
  status: CalendarUiStatus
  visibility?: string
}

type FormMode = 'list' | 'create' | 'edit'

type EventForm = {
  title: string
  description: string
  startsLocal: string
  endsLocal: string
  kind: string
}

function emptyForm(day: Date): EventForm {
  const { start, end } = defaultEventSlot(day)
  return {
    title: '',
    description: '',
    startsLocal: toDatetimeLocalValue(start),
    endsLocal: toDatetimeLocalValue(end),
    kind: 'study',
  }
}

function formFromEvent(ev: DayModalEvent): EventForm {
  return {
    title: ev.title,
    description: String(ev.description ?? ''),
    startsLocal: toDatetimeLocalValue(new Date(ev.starts_at)),
    endsLocal: toDatetimeLocalValue(new Date(ev.ends_at)),
    kind: ev.kind,
  }
}

function statusLabel(status: CalendarUiStatus) {
  if (status === 'overdue') return 'Overdue'
  if (status === 'completed') return 'Done'
  if (status === 'archived') return 'Archived'
  return 'Upcoming'
}

function formatEventTime(starts: string, ends: string) {
  const s = new Date(starts)
  const e = new Date(ends)
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${time(s)} – ${time(e)}`
}

type Props = {
  day: Date
  events: DayModalEvent[]
  onClose: () => void
  onSaved: () => Promise<unknown>
}

export function CalendarDayModal({ day, events, onClose, onSaved }: Props) {
  const confirm = useConfirm()
  const titleId = useId()
  const [mode, setMode] = useState<FormMode>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(() => emptyForm(day))
  const [pending, setPending] = useState(false)

  const dayLabel = day.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm(day))
    setMode('create')
  }

  function openEdit(ev: DayModalEvent) {
    setEditingId(ev.id)
    setForm(formFromEvent(ev))
    setMode('edit')
  }

  function backToList() {
    setMode('list')
    setEditingId(null)
    setForm(emptyForm(day))
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    const start = new Date(form.startsLocal)
    const end = new Date(form.endsLocal)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Enter valid start and end times')
      return
    }
    if (end <= start) {
      toast.error('End time must be after start time')
      return
    }
    setPending(true)
    try {
      const editing = mode === 'edit' && editingId ? events.find(x => x.id === editingId) : undefined
      await postAction('event.save', {
        id: mode === 'edit' ? editingId : undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        kind: form.kind,
        visibility: (editing?.visibility as 'private' | 'course' | 'global') ?? 'private',
      })
      await onSaved()
      toast.success(mode === 'edit' ? 'Event updated' : 'Event added')
      backToList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save event')
    } finally {
      setPending(false)
    }
  }

  async function removeEvent(ev: DayModalEvent) {
    const ok = await confirm({
      title: 'Delete event',
      description: `Remove “${ev.title}” from your calendar? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setPending(true)
    try {
      await postAction('event.delete', { id: ev.id })
      await onSaved()
      toast.success('Event deleted')
      if (mode === 'edit' && editingId === ev.id) backToList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setPending(false)
    }
  }

  async function completeEvent(id: string) {
    setPending(true)
    try {
      await postAction('event.complete', { id })
      await onSaved()
      toast.success('Marked complete')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete')
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-xl motion-safe:animate-enter sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold leading-tight">
                {mode === 'create' ? 'New event' : mode === 'edit' ? 'Edit event' : dayLabel}
              </h2>
              {mode === 'list' ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {events.length === 0 ? 'No activities yet — add one below.' : `${events.length} scheduled`}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">{dayLabel}</p>
              )}
            </div>
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {mode === 'list' ? (
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                  Nothing planned for this day. Create a study block, deadline, or lecture reminder.
                </p>
              ) : (
                <ul className="space-y-2">
                  {events.map(ev => (
                    <li key={ev.id} className={cn('rounded-xl border p-3 text-sm', kindAccent(ev.kind))}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{ev.title}</p>
                          {ev.description ? (
                            <p className="mt-1 text-xs opacity-90 line-clamp-3">{ev.description}</p>
                          ) : null}
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium opacity-90">
                            <Clock className="size-3.5 shrink-0" aria-hidden />
                            {formatEventTime(ev.starts_at, ev.ends_at)}
                          </p>
                          <p className="mt-1 text-xs">
                            {EVENT_KIND_LABELS[ev.kind] ?? ev.kind} · {statusLabel(ev.status)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" className="bg-background/80" onClick={() => openEdit(ev)}>
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        {ev.status !== 'completed' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="bg-background/80"
                            disabled={pending}
                            onClick={() => void completeEvent(ev.id)}
                          >
                            Done
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => void removeEvent(ev)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <form id="calendar-day-form" className="space-y-4" onSubmit={submitForm}>
              <div className="space-y-2">
                <Label htmlFor="cal-title">Title</Label>
                <Input
                  id="cal-title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Group study — Research methods"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-desc">Notes (optional)</Label>
                <Textarea
                  id="cal-desc"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Room, chapter, or prep details"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cal-start">Starts</Label>
                  <Input
                    id="cal-start"
                    type="datetime-local"
                    value={form.startsLocal}
                    onChange={e => setForm(f => ({ ...f, startsLocal: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cal-end">Ends</Label>
                  <Input
                    id="cal-end"
                    type="datetime-local"
                    value={form.endsLocal}
                    onChange={e => setForm(f => ({ ...f, endsLocal: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-kind">Type</Label>
                <Select id="cal-kind" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
                  {Object.entries(EVENT_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
          {mode === 'list' ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="button" onClick={openCreate}>
                <Plus className="size-4" aria-hidden />
                Add event
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={backToList} disabled={pending}>
                Back
              </Button>
              <Button type="submit" form="calendar-day-form" disabled={pending}>
                {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create event'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
