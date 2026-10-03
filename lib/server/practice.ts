import 'server-only'
import { z } from 'zod'
import { AppError, requirePermission, type Actor } from '@/lib/domain'
import { rows, one, transaction } from './db'
import { getAIProvider } from './ai/provider'
import { aiUsageForActor, AI_LIFETIME_MESSAGE_LIMIT } from './ai/usage'

export async function listPracticeQuizzes(actor: Actor) {
  return transaction(actor.id, db =>
    rows(db, 'SELECT id, title, source_excerpt, created_at FROM practice_quizzes WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [
      actor.id,
    ]),
  )
}

export async function savePracticeQuiz(actor: Actor, input: unknown) {
  const value = z
    .object({
      title: z.string().trim().min(1).max(120),
      source_excerpt: z.string().max(20000).default(''),
      payload: z.string().trim().min(1).max(50000),
    })
    .strict()
    .parse(input)
  return transaction(actor.id, db =>
    one(
      db,
      'INSERT INTO practice_quizzes(user_id, title, source_excerpt, payload) VALUES ($1,$2,$3,$4) RETURNING id',
      [actor.id, value.title, value.source_excerpt, value.payload],
    ),
  )
}

export async function generatePracticeFromText(actor: Actor, input: unknown) {
  requirePermission(actor, 'ai.use')
  const { source_text } = z.object({ source_text: z.string().trim().min(20).max(20000) }).strict().parse(input)
  const usage = await aiUsageForActor(actor)
  if (usage.remaining <= 0) {
    throw new AppError(429, `You have used all ${AI_LIFETIME_MESSAGE_LIMIT} AI messages on this account.`)
  }

  const provider = getAIProvider(String(process.env.AI_PROVIDER || 'openrouter'))
  return transaction(actor.id, async db => {
    const prompt = `You are a scholarly study coach for LearnHub. From the material below, create themed practice aligned with the topics in the notes.

Use this markdown structure exactly (headings must start with ## and ###):
## Topic overview
Brief summary of the main themes (2-4 sentences).

## Multiple choice
### Question 1
Stem text
A) ...
B) ...
C) ...
D) ...

(Continue with 3-5 more ### Question blocks.)

## Short answer
### Question 1
Prompt requiring 2-4 sentences.

(Add 2-3 more short-answer ### Question blocks.)

## Answer key
Numbered answers matching every question above.

Material:
${source_text}`
    const content = await provider.chat(
      [{ role: 'user', content: prompt }],
      { model: String(process.env.AI_MODEL || ''), temperature: 0.5, maxTokens: 2000 },
    )
    const conversation = await one<{ id: string }>(
      db,
      'INSERT INTO ai_conversations(user_id, title) VALUES ($1, $2) RETURNING id',
      [actor.id, 'Test Yourself'],
    )
    await db.query('INSERT INTO ai_messages(conversation_id, role, content) VALUES ($1,$2,$3)', [
      conversation.id,
      'user',
      prompt.slice(0, 8000),
    ])
    await db.query('INSERT INTO ai_messages(conversation_id, role, content) VALUES ($1,$2,$3)', [
      conversation.id,
      'assistant',
      content,
    ])
    return { content }
  })
}
