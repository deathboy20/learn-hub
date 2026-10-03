'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Paperclip } from 'lucide-react'
import { ScholarBookIcon } from '@/components/scholar-book-icon'
import { ComingSoonDialog } from '@/components/coming-soon-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiGet, apiPost } from '@/lib/client/api-fetch'
import type { Role } from '@/lib/domain'
import { cn } from '@/lib/utils'

function assistantTitle(role: Role) {
  if (role === 'lecturer') return 'Teaching Assistant'
  if (role === 'admin') return 'Platform Administration Assistant'
  if (role === 'super_admin') return 'Platform Operations Assistant'
  return 'Academic Study Assistant'
}

export function AiChatPanel({ role, variant = 'page' }: { role: Role; variant?: 'page' | 'fab' }) {
  const [message, setMessage] = useState('')
  const [log, setLog] = useState<Array<{ role: string; content: string }>>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [isSending, setIsSending] = useState(false)

  const usageQuery = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => apiGet<{ used: number; limit: number; remaining: number }>('/api/ai/usage'),
  })

  const remaining = usageQuery.data?.remaining ?? 0
  const atLimit = usageQuery.data !== undefined && remaining <= 0
  const busy = isSending

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (!text || atLimit || busy) return
    setIsSending(true)
    setLog(prev => [...prev, { role: 'user', content: text }])
    setMessage('')
    try {
      const body = await apiPost<{ conversation_id: string; reply: string }>('/api/ai', {
        message: text,
        conversation_id: conversationId,
      })
      if (body.conversation_id) setConversationId(body.conversation_id)
      setLog(prev => [...prev, { role: 'assistant', content: body.reply }])
      await usageQuery.refetch()
    } catch (err) {
      setLog(prev => prev.filter((entry, i) => !(i === prev.length - 1 && entry.role === 'user' && entry.content === text)))
      setMessage(text)
      toast.error(err instanceof Error ? err.message : 'AI unavailable')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
            <ScholarBookIcon className="size-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{assistantTitle(role)}</h2>
            <p className="text-xs text-muted-foreground">
              Text-only study help for now — type your question below. File and voice input are not available yet.
            </p>
          </div>
        </div>
        {usageQuery.data && (
          <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">
            {remaining} of {usageQuery.data.limit} messages left (shared with Test Yourself)
          </p>
        )}
      </div>
      <div
        className={cn(
          'min-h-[200px] space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-3',
          variant === 'fab' ? 'max-h-[min(40dvh,320px)]' : 'max-h-[min(50vh,360px)]',
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
      >
        {log.map((entry, i) => (
          <div key={i} className={entry.role === 'user' ? 'text-right' : ''}>
            <p
              className={cn(
                'inline-block max-w-[95%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                entry.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              {entry.content}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <ComingSoonDialog feature="Attach files to AI" description="Text-only messages in this release">
          {open => (
            <Button type="button" variant="outline" size="icon" onClick={open} aria-label="Attach file">
              <Paperclip className="size-4" />
            </Button>
          )}
        </ComingSoonDialog>
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={atLimit ? 'Message limit reached' : 'Ask a study question…'}
          disabled={atLimit || busy}
          aria-label="Message"
          className="flex-1"
        />
        <Button type="submit" disabled={atLimit || busy || !message.trim()}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span className="sr-only">Sending message</span>
            </>
          ) : (
            'Send'
          )}
        </Button>
      </form>
    </div>
  )
}
