'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useWorkspace } from '@/hooks/use-workspace'
import { apiGet } from '@/lib/client/api-fetch'
import { postQuiz } from '@/lib/client/mutate'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/workspace/loading-state'

type QuizDetailPayload = {
  quiz: Record<string, unknown>
  questions: Array<Record<string, unknown>>
  attempts: Array<Record<string, unknown>>
}

export function QuizList() {
  const { data, isLoading } = useWorkspace()
  if (isLoading) return <LoadingState />
  const quizzes = (data?.quizzes as Array<Record<string, unknown>>).filter(q => q.status === 'published')
  return (
    <div className="w-full max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Quizzes</h1>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {quizzes.map(q => (
          <li key={String(q.id)} className="flex justify-between p-4">
            <div><p className="font-medium">{String(q.title)}</p><p className="text-xs text-muted-foreground">{String(q.code)} · {String(q.time_limit)} min</p></div>
            <Link href={`/quizzes/${q.id}`} className="text-sm text-primary">Open</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function QuizDetail() {
  const { quizId } = useParams<{ quizId: string }>()
  const router = useRouter()
  const detailQuery = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => apiGet<QuizDetailPayload>(`/api/quizzes?id=${encodeURIComponent(quizId ?? '')}`),
    enabled: Boolean(quizId),
  })

  async function start() {
    if (!quizId) return
    try {
      const attempt = await postQuiz<{ id: string }>({ action: 'start', quiz_id: quizId })
      router.push(`/quizzes/${quizId}/attempt?attempt=${attempt.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start quiz')
    }
  }

  if (detailQuery.isLoading) return <LoadingState />
  const quiz = detailQuery.data?.quiz
  if (!quiz) return <p>Quiz unavailable.</p>
  return (
    <div className="w-full max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{String(quiz.title)}</h1>
      <p className="text-muted-foreground">{String(quiz.description)}</p>
      <Button onClick={start}>Start attempt</Button>
    </div>
  )
}

export function QuizAttempt() {
  const { quizId } = useParams<{ quizId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt') ?? ''
  const detailQuery = useQuery({
    queryKey: ['quiz', quizId, attemptId],
    queryFn: () => apiGet<QuizDetailPayload & { attempts: Array<Record<string, unknown>> }>(
      `/api/quizzes?id=${encodeURIComponent(quizId ?? '')}`,
    ),
    enabled: Boolean(quizId),
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [expires, setExpires] = useState<number | null>(null)

  const attempt = detailQuery.data?.attempts.find(a => String(a.id) === attemptId)

  useEffect(() => {
    if (attempt?.expires_at) setExpires(new Date(String(attempt.expires_at)).getTime())
  }, [attempt])

  useEffect(() => {
    if (!expires) return
    const t = setInterval(() => { if (Date.now() >= expires) toast.message('Time expired. Submit your answers.') }, 1000)
    return () => clearInterval(t)
  }, [expires])

  async function submit() {
    if (!attemptId || !quizId) return
    try {
      await postQuiz({
        action: 'submit',
        quiz_id: quizId,
        attempt_id: attemptId,
        answers,
      })
      router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed')
    }
  }

  if (detailQuery.isLoading) return <LoadingState />
  const questions = detailQuery.data?.questions ?? []
  return (
    <div className="w-full max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Quiz attempt</h1>
      {questions.map((q, i) => (
        <fieldset key={String(q.id)} className="rounded-xl border border-border p-4">
          <legend className="font-medium">{i + 1}. {String(q.prompt)}</legend>
          {(q.options as Array<{ id: string; label: string }> | undefined)?.map(opt => (
            <label key={opt.id} className="mt-2 flex items-center gap-2 text-sm">
              <input type="radio" name={String(q.id)} value={opt.label} onChange={() => setAnswers(a => ({ ...a, [String(q.id)]: opt.label }))} />
              {opt.label}
            </label>
          ))}
          {q.type === 'short_answer' && (
            <input className="mt-2 w-full rounded border border-input px-2 py-1 text-sm" onChange={e => setAnswers(a => ({ ...a, [String(q.id)]: e.target.value }))} />
          )}
        </fieldset>
      ))}
      <Button onClick={submit}>Submit quiz</Button>
    </div>
  )
}

export function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attempt') ?? ''
  const detailQuery = useQuery({
    queryKey: ['quiz-results', quizId, attemptId],
    queryFn: () => apiGet<QuizDetailPayload>(`/api/quizzes?id=${encodeURIComponent(quizId ?? '')}`),
    enabled: Boolean(quizId),
  })

  if (detailQuery.isLoading) return <LoadingState />
  const attempt = detailQuery.data?.attempts.find(a => String(a.id) === attemptId)
  if (!attempt) return <LoadingState />
  return (
    <div className="w-full max-w-lg space-y-3 text-center">
      <h1 className="text-2xl font-bold">Quiz result</h1>
      <p className="text-4xl font-bold text-primary">{String(attempt.score)}%</p>
      <p className="text-muted-foreground">{String(attempt.earned)} / {String(attempt.total)} points</p>
      <Link href="/quizzes" className="text-primary">Back to quizzes</Link>
    </div>
  )
}
