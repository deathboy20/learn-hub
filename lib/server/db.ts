import 'server-only'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { AppError } from '@/lib/domain'

const globalDb = globalThis as typeof globalThis & { learnhubPool?: Pool }

function poolConfig(): ConstructorParameters<typeof Pool>[0] {
  const connectionString = process.env.DATABASE_URL
  const config: ConstructorParameters<typeof Pool>[0] = {
    connectionString,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }
  if (connectionString && /(supabase\.(co|com)|pooler\.supabase\.com)/i.test(connectionString)) {
    config.ssl = { rejectUnauthorized: false }
  }
  return config
}

export const pool = globalDb.learnhubPool ?? new Pool(poolConfig())
if (process.env.NODE_ENV !== 'production') globalDb.learnhubPool = pool
pool.on('error', (error) => console.error(JSON.stringify({ event: 'database.pool.error', message: error.message })))
export async function transaction<T>(userId: string | null, run: (db: PoolClient) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) throw new AppError(503, 'The database is not configured. Ask the platform operator to complete setup.')
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await db.query("SELECT set_config('app.user_id', $1, true)", [userId ?? ''])
    const result = await run(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally { db.release() }
}
export async function rows<T extends QueryResultRow>(db: PoolClient, sql: string, values: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, values)).rows
}
export async function one<T extends QueryResultRow>(db: PoolClient, sql: string, values: unknown[] = []): Promise<T> {
  const result = await rows<T>(db, sql, values)
  if (!result[0]) throw new AppError(404, 'This record is unavailable or you do not have access to it.')
  return result[0]
}
export async function audit(db: PoolClient, actorId: string, action: string, target: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await db.query('INSERT INTO audit_logs(actor_id, action, target, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [actorId, action, target, targetId, JSON.stringify(metadata)])
}
