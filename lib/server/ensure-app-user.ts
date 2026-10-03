import 'server-only'
import type { User } from '@supabase/supabase-js'
import { pool } from './db'

function roleFromUser(user: User): string {
  const fromMeta = user.app_metadata?.role
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta
  return 'student'
}

/** Sync Supabase Auth users into the LearnHub `"user"` + `profiles` tables. */
export async function ensureAppUser(user: User): Promise<void> {
  const name =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    user.email?.split('@')[0] ||
    'LearnHub user'
  const email = user.email ?? ''
  if (!email) return

  const role = roleFromUser(user)
  const verified = Boolean(user.email_confirmed_at)

  await pool.query(
    `INSERT INTO "user"(id, name, email, "emailVerified", image, role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       "emailVerified" = EXCLUDED."emailVerified",
       image = COALESCE(EXCLUDED.image, "user".image),
       role = CASE WHEN "user".role = 'super_admin' THEN "user".role ELSE EXCLUDED.role END,
       "updatedAt" = now()`,
    [user.id, name, email, verified, user.user_metadata?.avatar_url ?? null, role],
  )
  await pool.query('INSERT INTO profiles(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [user.id])
}
