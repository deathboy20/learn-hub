'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiChatPanel } from '@/components/workspace/ai-chat-panel'
import { ScholarBookIcon } from '@/components/scholar-book-icon'
import type { Role } from '@/lib/domain'
import type { MobilePlatform } from '@/hooks/use-mobile-platform'
import { cn } from '@/lib/utils'

export function AiAssistantFab({ role, platform }: { role: Role; platform: MobilePlatform }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (role !== 'student') return null

  return (
    <>
      <Button
        type="button"
        size="icon"
        className={cn(
          'fixed right-4 z-[46] size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90',
          'md:bottom-6 md:right-6',
          platform === 'ios' && 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]',
          platform === 'android' && 'bottom-[calc(4.25rem+env(safe-area-inset-bottom))]',
          platform === 'desktop' && 'bottom-6',
          open && 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(true)}
        title="Open scholar study assistant (text only)"
        aria-label="Open scholar study assistant. Text-only messages."
      >
        <ScholarBookIcon className="size-7 text-primary-foreground" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:items-center sm:justify-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close assistant overlay"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl motion-safe:animate-enter"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
              <p id={titleId} className="sr-only">
                Scholar study assistant
              </p>
              <Button
                ref={closeRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close scholar assistant"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
              <AiChatPanel role={role} variant="fab" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
