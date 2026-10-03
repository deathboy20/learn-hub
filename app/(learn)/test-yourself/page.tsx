'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Paperclip, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { ComingSoonDialog } from '@/components/coming-soon-dialog'
import { PracticeQuestionsDisplay } from '@/components/workspace/practice-questions-display'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPost } from '@/lib/client/api-fetch'
import { savePracticeQuizOffline } from '@/lib/offline/practice-store'

export default function TestYourselfPage() {
  const [sourceText, setSourceText] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)

  const usageQuery = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => apiGet<{ used: number; limit: number; remaining: number }>('/api/ai/usage'),
  })

  const savedQuery = useQuery({
    queryKey: ['practice-saved'],
    queryFn: () => apiGet<{ saved: Array<{ id: string; title: string }> }>('/api/practice'),
  })

  const remaining = usageQuery.data?.remaining ?? 0
  const atLimit = usageQuery.data !== undefined && remaining <= 0

  async function onGenerate() {
    if (atLimit) {
      toast.error('You have used all AI messages on this account.')
      return
    }
    setBusy(true)
    try {
      const { content } = await apiPost<{ content: string }>(
        '/api/practice?mode=generate',
        { source_text: sourceText },
        'Generating practice questions…',
      )
      setResult(content)
      await usageQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSave() {
    if (!result.trim()) return
    const title = sourceText.slice(0, 48) || 'Practice quiz'
    const saved = await apiPost<{ id: string }>('/api/practice?mode=save', {
      title,
      source_excerpt: sourceText,
      payload: result,
    })
    await savePracticeQuizOffline(String(saved.id), title, result)
    await savedQuery.refetch()
    toast.success('Saved to library and offline cache')
  }

  const saved = savedQuery.data?.saved ?? []

  return (
    <div className="w-full max-w-6xl space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Test Yourself</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste study notes as text. The scholar assistant generates themed practice questions and uses one message from
          your LearnHub quota each time you generate.
        </p>
        {usageQuery.data && (
          <p className="mt-2 text-xs font-medium text-muted-foreground" aria-live="polite">
            {remaining} of {usageQuery.data.limit} AI messages remaining (same pool as the floating assistant)
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <ComingSoonDialog feature="Document upload" description="Paste text for now. File upload is not available yet.">
          {open => (
            <Button type="button" variant="outline" size="sm" onClick={open}>
              <Paperclip className="mr-2 size-4" aria-hidden />
              Upload file
            </Button>
          )}
        </ComingSoonDialog>
        <span className="text-xs text-muted-foreground">Text-only input in this release</span>
      </div>

      <Textarea
        value={sourceText}
        onChange={e => setSourceText(e.target.value)}
        placeholder="Paste lecture notes or revision material here…"
        rows={8}
        aria-label="Study material to generate questions from"
        className="min-h-[10rem] resize-y"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy || !sourceText.trim() || atLimit}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" aria-hidden />
              Generate questions
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void onGenerate()}
          disabled={busy || !sourceText.trim() || atLimit}
        >
          Regenerate
        </Button>
        {result && (
          <Button type="button" variant="outline" onClick={() => void onSave()}>
            Save quiz
          </Button>
        )}
      </div>

      {atLimit && (
        <p className="text-sm text-destructive" role="status">
          Message limit reached. Test Yourself and the scholar assistant share the same lifetime quota.
        </p>
      )}

      {result && (
        <section aria-labelledby="generated-practice-heading">
          <h2 id="generated-practice-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Generated practice
          </h2>
          <PracticeQuestionsDisplay content={result} />
        </section>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="saved-practice-heading">
          <h2 id="saved-practice-heading" className="text-sm font-semibold">
            Saved practice sets
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {saved.map(item => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
