import 'server-only'
import { AppError, type Actor, roles } from '@/lib/domain'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAppUser } from '@/lib/server/ensure-app-user'
import { appErrorFromUnknown } from '@/lib/server/pg-errors'
import { transaction, one } from './db'

export async function currentActor(): Promise<Actor> {
  if (!process.env.DATABASE_URL) {
    throw new AppError(
      503,
      'Database is not configured. Set DATABASE_URL (Supabase Postgres connection string).',
    )
  }
  const hasSupabasePublic =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  if (!hasSupabasePublic) {
    throw new AppError(
      503,
      'Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new AppError(401, 'Sign in to continue.')

  try {
    await ensureAppUser(data.user)
  } catch (error) {
    const mapped = appErrorFromUnknown(error)
    if (mapped) throw mapped
    console.error(JSON.stringify({ event: 'ensureAppUser.failed', message: error instanceof Error ? error.message : 'unknown' }))
    throw new AppError(
      503,
      'Could not sync your account with the database. Set DATABASE_URL on the server and run migrations plus demo seed.',
    )
  }
  const userId = data.user.id

  return transaction(userId, async (db) => {
    const user = await one<Actor>(
      db,
      `SELECT u.id,u.name,u.email,u.role,u.image,COALESCE(p.status,'active') status,p.programme_id,p.department_id,p.level,p.bio,
      COALESCE((SELECT json_agg(permission_key) FROM role_permissions WHERE role=u.role),'[]') permissions
      FROM "user" u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=$1`,
      [userId],
    )
    if (user.status !== 'active') throw new AppError(403, 'This account is disabled. Contact platform support.')
    if (!roles.includes(user.role)) throw new AppError(403, 'This account does not have a supported role.')
    return user
  })
}
