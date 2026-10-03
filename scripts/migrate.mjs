import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import pg from 'pg'

const connectionString =
  process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Set DATABASE_URL in .env.local (Supabase → Project Settings → Database → Connection string). ' +
      'Use the Session pooler URI as shown in the dashboard (do not leave [region] as literal text).',
  )
}

if (/\[region\]/i.test(connectionString)) {
  throw new Error(
    'DATABASE_URL still contains the placeholder [region]. ' +
      'Replace it with the exact host from Supabase Dashboard → Database → Connection string.',
  )
}

function redactConnectionString(url) {
  try {
    const u = new URL(url.replace(/^postgresql:/, 'postgres:'))
    return `${u.protocol}//${u.username ? `${u.username}:***@` : ''}${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return '(invalid DATABASE_URL)'
  }
}

function poolOptions(url) {
  const opts = { connectionString: url, max: 2 }
  if (/supabase\.(co|com)/i.test(url)) {
    opts.ssl = { rejectUnauthorized: false }
  }
  return opts
}

console.log(`Connecting to ${redactConnectionString(connectionString)}`)

const pool = new pg.Pool(poolOptions(connectionString))
let db
try {
  db = await pool.connect()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('ENOTFOUND') && message.includes('db.') && message.includes('supabase.co')) {
    throw new Error(
      `${message}\n\n` +
        'Direct db.*.supabase.co often fails on Windows (IPv6-only DNS). ' +
        'Use the Session pooler connection string from the Supabase dashboard instead.',
      { cause: error },
    )
  }
  if (message.includes('tenant/user') && message.includes('not found')) {
    throw new Error(
      `${message}\n\n` +
        'Pooler region or username is wrong. Copy the URI exactly from Supabase → Database. ' +
        'Username is usually postgres.[project-ref], not postgres alone.',
      { cause: error },
    )
  }
  throw error
}

try {
  await db.query("SELECT pg_advisory_lock(hashtext('learnhub:migrations'))")
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
  )
  for (const name of (await readdir(new URL('../db/migrations/', import.meta.url)))
    .filter(name => name.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(new URL(`../db/migrations/${name}`, import.meta.url), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const previous = await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name])
    if (previous.rows[0]) {
      if (previous.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration ${name} has changed. Create a new migration instead.`)
      }
      continue
    }
    await db.query('BEGIN')
    try {
      await db.query(sql)
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum])
      await db.query('COMMIT')
      console.log(`${new Date().toISOString()} Applied ${name}`)
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await db.query("SELECT pg_advisory_unlock(hashtext('learnhub:migrations'))")
  db.release()
  await pool.end()
}
