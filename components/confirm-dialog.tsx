'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | undefined>(undefined)
  const titleId = useId()
  const descriptionId = useId()

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
      setOpen(options)
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOpen(null)
    const resolve = resolverRef.current
    resolverRef.current = undefined
    resolve?.(result)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg motion-safe:animate-enter"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                  open.destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}
              >
                <AlertTriangle className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold text-foreground">
                  {open.title}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
                  {open.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {open.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                type="button"
                variant={open.destructive ? 'destructive' : 'default'}
                autoFocus
                onClick={() => close(true)}
              >
                {open.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return ctx.confirm
}
