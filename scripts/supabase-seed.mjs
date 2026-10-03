/**
 * Seed LearnHub demo users in Supabase Auth (email confirmed) and sync into Postgres `"user"` + `profiles`.
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, optional DEMO_ACCOUNT_PASSWORD
 */
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? 'LearnHubDemo2026!'
const databaseUrl = process.env.DATABASE_URL

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl }) : null

const accounts = [
  { email: 'student@learnhub.demo', role: 'student', name: 'Ama Mensah' },
  { email: 'lecturer@learnhub.demo', role: 'lecturer', name: 'Dr. Kwesi Boateng' },
  { email: 'admin@learnhub.demo', role: 'admin', name: 'Abena Osei' },
  { email: 'superadmin@learnhub.demo', role: 'super_admin', name: 'Prof. Yaw Adom' },
]

async function syncAppUser(userId, account) {
  if (!pool) return
  await pool.query(
    `INSERT INTO "user"(id, name, email, "emailVerified", role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, "emailVerified" = true, "updatedAt" = now()`,
    [userId, account.name, account.email, account.role],
  )
  await pool.query('INSERT INTO profiles(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId])
}

for (const account of accounts) {
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    app_metadata: { role: account.role },
    user_metadata: { name: account.name },
  })
  if (error && !String(error.message).toLowerCase().includes('already')) {
    console.error(account.email, error.message)
    continue
  }
  let userId = data?.user?.id
  if (!userId) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    userId = listed.data.users.find(u => u.email === account.email)?.id
  }
  if (userId) {
    await syncAppUser(userId, account)
  }
  console.log('OK', account.email, account.role)
}

if (pool) await pool.end()

console.log('Demo password:', password)
console.log('Run db:seed for academic catalogue data after migrations.')
