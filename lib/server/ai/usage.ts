import 'server-only'
import type { Actor } from '@/lib/domain'
import { one, transaction } from '@/lib/server/db'

export const AI_LIFETIME_MESSAGE_LIMIT = 10

export async function aiUsageForActor(actor: Actor) {
  return transaction(actor.id, async db => {
    const row = await one<{ count: string }>(
      db,
      `SELECT count(*)::text AS count FROM ai_messages m
       JOIN ai_conversations c ON c.id = m.conversation_id
       WHERE c.user_id = $1 AND m.role = 'user'`,
      [actor.id],
    )
    const used = Number(row.count)
    const limit = AI_LIFETIME_MESSAGE_LIMIT
    return { used, limit, remaining: Math.max(0, limit - used) }
  })
}
