'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ComingSoonDialogProps = {
  feature: string
  description?: string
  children: (open: () => void) => React.ReactNode
}

export function ComingSoonDialog({ feature, description, children }: ComingSoonDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {children(() => setOpen(true))}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coming-soon-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id="coming-soon-title" className="text-lg font-semibold text-foreground">
                  Coming soon
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{feature}</span>
                  {description ? ` — ${description}` : ' will be available in a future release.'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" autoFocus onClick={() => setOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function useComingSoon() {
  const [open, setOpen] = useState(false)
  const [feature, setFeature] = useState('This feature')
  const [description, setDescription] = useState<string | undefined>()

  function show(f: string, desc?: string) {
    setFeature(f)
    setDescription(desc)
    setOpen(true)
  }

  const dialog = open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{feature}</span>
          {description ? ` — ${description}` : ' is not available yet.'}
        </p>
        <Button type="button" className="mt-6" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </div>
    </div>
  ) : null

  return { show, dialog }
}
