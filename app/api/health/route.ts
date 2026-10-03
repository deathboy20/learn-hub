import { NextResponse } from 'next/server'
import { pool } from '@/lib/server/db'
import { requireSupabasePublicEnv } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

/** Public deployment check — no secrets returned. */
export async function GET() {
  const checks: Record<string, 'ok' | 'missing' | 'error'> = {
    supabasePublic: 'missing',
    databaseUrl: process.env.DATABASE_URL ? 'ok' : 'missing',
    database: 'missing',
    userTable: 'missing',
  }

  try {
    requireSupabasePublicEnv()
    checks.supabasePublic = 'ok'
  } catch {
    checks.supabasePublic = 'missing'
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { status: 'degraded', checks, hint: 'Set DATABASE_URL (Supabase pooler URI) in Vercel environment variables.' },
      { status: 503 },
    )
  }

  try {
    await pool.query('SELECT 1')
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
    return NextResponse.json(
      {
        status: 'degraded',
        checks,
        hint: 'Database unreachable. Use Session pooler host (e.g. aws-1-REGION.pooler.supabase.com:5432), not db.PROJECT.supabase.co.',
      },
      { status: 503 },
    )
  }

  try {
    await pool.query('SELECT 1 FROM "user" LIMIT 1')
    checks.userTable = 'ok'
  } catch {
    checks.userTable = 'error'
    return NextResponse.json(
      { status: 'degraded', checks, hint: 'Run pnpm db:migrate locally with DATABASE_URL pointing at this Supabase project.' },
      { status: 503 },
    )
  }

  return NextResponse.json({
    status: 'ok',
    checks,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  })
}
