'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { subscribeActionBusy } from '@/lib/client/action-busy'

export function GlobalActionLoader() {
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => subscribeActionBusy((nextBusy, nextLabel) => {
    setBusy(nextBusy)
    setLabel(nextLabel)
  }), [])

  if (!busy) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-lg">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-foreground">{label ?? 'Working…'}</p>
      </div>
    </div>
  )
}
