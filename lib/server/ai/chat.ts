import 'server-only'
import { z } from 'zod'
import { AppError, requirePermission, type Actor } from '@/lib/domain'
import { one, rows, transaction } from '@/lib/server/db'
import { getAIProvider } from './provider'
import { AI_LIFETIME_MESSAGE_LIMIT, aiUsageForActor } from './usage'

export async function runAIChat(actor: Actor, input: unknown) {
  requirePermission(actor, 'ai.use')
  const value = z.object({ conversation_id: z.string().uuid().optional(), message: z.string().trim().min(1).max(8000), resource_id: z.string().uuid().optional() }).strict().parse(input)
  const usage = await aiUsageForActor(actor)
  if (usage.remaining <= 0) {
    throw new AppError(429, `You have used all ${AI_LIFETIME_MESSAGE_LIMIT} AI messages on this account.`)
  }
  return transaction(actor.id, async db => {
    const settings = await one<{ value: Record<string, unknown> }>(db, "SELECT value FROM system_settings WHERE key='ai'")
    const ai = settings.value
    if (!ai.enabled) throw new AppError(503, 'The academic assistant is disabled.')
    if (actor.role === 'student' && !ai.student_access) throw new AppError(403, 'Students cannot use the assistant.')
    if (actor.role === 'lecturer' && !ai.lecturer_access) throw new AppError(403, 'Lecturers cannot use the assistant.')
    const flag = await one<{ enabled: boolean }>(db, "SELECT enabled FROM feature_flags WHERE key='ai'")
    if (!flag.enabled) throw new AppError(503, 'AI feature flag is off.')

    let context = ''
    if (value.resource_id) {
      const chunks = await rows<{ content: string }>(db, `SELECT content FROM document_chunks WHERE resource_id=$1 ORDER BY position LIMIT 8`, [value.resource_id])
      context = chunks.map(c => c.content).join('\n').slice(0, 12000)
    } else if (value.message.length > 10) {
      const chunks = await rows<{ content: string; resource_id: string }>(db, `SELECT content, resource_id FROM document_chunks WHERE search @@ plainto_tsquery('english', $1) LIMIT 8`, [value.message.split(/\s+/).slice(0, 8).join(' ')])
      context = chunks.map(c => c.content).join('\n').slice(0, 12000)
    }

    const conversationId = value.conversation_id ?? (await one<{ id: string }>(db, 'INSERT INTO ai_conversations(user_id,title) VALUES($1,$2) RETURNING id', [actor.id, value.message.slice(0, 80)])).id
    if (value.conversation_id) {
      const owner = await one<{ user_id: string }>(db, 'SELECT user_id FROM ai_conversations WHERE id=$1', [value.conversation_id])
      if (owner.user_id !== actor.id) throw new AppError(403, 'Conversation access denied.')
    }

    await db.query('INSERT INTO ai_messages(conversation_id,role,content) VALUES($1,$2,$3)', [conversationId, 'user', value.message])
    const provider = getAIProvider(String(process.env.AI_PROVIDER || ai.provider || 'openrouter'))
    const system = 'You are LearnHub academic assistant. Answer using only provided context when present. If unsure, say so. Never reveal secrets or other users\' data.'
    const reply = await provider.chat([
      { role: 'user', content: `${system}\n\nContext:\n${context || '(none)'}\n\nQuestion:\n${value.message}` },
    ], { model: String(ai.model || ''), temperature: Number(ai.temperature ?? 0.4), maxTokens: Number(ai.max_tokens ?? 1500) })
    await db.query('INSERT INTO ai_messages(conversation_id,role,content,sources) VALUES($1,$2,$3,$4)', [conversationId, 'assistant', reply, JSON.stringify(context ? [{ type: 'chunks' }] : [])])
    return { conversation_id: conversationId, reply }
  })
}

export async function getAISettings(actor: Actor) {
  requirePermission(actor, 'system.manage')
  return transaction(actor.id, db => one(db, "SELECT value FROM system_settings WHERE key='ai'"))
}
