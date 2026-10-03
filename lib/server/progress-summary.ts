import 'server-only'
import type { Actor } from '@/lib/domain'
import { rows, transaction } from './db'

export async function progressSummaryForActor(actor: Actor) {
  return transaction(actor.id, async db => {
    const attempts = await rows<{ score: number | null }>(
      db,
      'SELECT score FROM quiz_attempts WHERE user_id=$1 AND submitted_at IS NOT NULL',
      [actor.id],
    )
    let academicPercent = 0
    if (attempts.length > 0) {
      academicPercent = Math.round(
        attempts.reduce((acc, row) => acc + Number(row.score ?? 0), 0) / attempts.length,
      )
    }

    const practice = await rows<{ count: string }>(
      db,
      'SELECT count(*)::text AS count FROM practice_quizzes WHERE user_id=$1',
      [actor.id],
    )
    const practiceSessions = Number(practice[0]?.count ?? 0)

    return {
      academicPercent,
      practiceSessions,
      practiceQuestions: practiceSessions * 6,
    }
  })
}
