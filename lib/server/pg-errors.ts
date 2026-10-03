import 'server-only'
import { AppError } from '@/lib/domain'

/** Map Postgres / network failures to operator-friendly API messages. */
export function appErrorFromUnknown(error: unknown): AppError | null {
  if (error instanceof AppError) return error

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''

  if (code === '42P01') {
    return new AppError(
      503,
      'Database schema is missing. Apply migrations (pnpm db:migrate) to your Supabase Postgres database.',
    )
  }
  if (code === '28P01') {
    return new AppError(503, 'Database login failed. Check DATABASE_URL username and password on Vercel.')
  }
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return new AppError(
      503,
      'Database is unreachable from the server. On Vercel, use the Supabase Session pooler URI (not the direct db.* host).',
    )
  }
  if (/self-signed certificate|certificate/i.test(message)) {
    return new AppError(503, 'Database SSL configuration failed. Use the Supabase pooler connection string with SSL enabled.')
  }
  if (/timeout/i.test(message)) {
    return new AppError(503, 'Database connection timed out. Verify DATABASE_URL and that Supabase allows connections from Vercel.')
  }

  return null
}
