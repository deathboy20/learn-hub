import 'server-only'

export type UserRole = 'student' | 'lecturer' | 'admin' | 'super_admin'

type LegacyAuthUser = {
  id: string
  email: string
  name: string
  role?: string
}

/** Minimal Better Auth surface used by legacy PostgreSQL routes (Convex MVP does not use this). */
type AuthInstance = {
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{ user?: LegacyAuthUser } | null>
  }
}

let authInstance: AuthInstance | null = null

function originCandidates() {
  return [
    process.env.V0_RUNTIME_URL,
    process.env.V0_DEV_APP_URL,
    process.env.V0_BUILD_URL,
    process.env.V0_SANDBOX_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ].filter((origin): origin is string => Boolean(origin))
}

/** PostgreSQL Better Auth — only initialized when `DATABASE_URL` is set (legacy stack). */
export function getAuth(): AuthInstance {
  if (!process.env.DATABASE_URL) {
    throw new Error('Better Auth is not configured. Set DATABASE_URL for legacy routes or use Supabase Auth.')
  }
  if (!authInstance) {
    // Lazy imports so Convex-only dev never touches Postgres or Better Auth startup checks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { betterAuth } = require('better-auth') as typeof import('better-auth')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pool } = require('@/lib/server/db') as typeof import('@/lib/server/db')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sendMail } = require('@/lib/server/mail') as typeof import('@/lib/server/mail')

    authInstance = betterAuth({
      database: pool,
      baseURL:
        process.env.BETTER_AUTH_URL
        ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
        ?? process.env.V0_RUNTIME_URL,
      trustedOrigins: [...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []), ...originCandidates()],
      secret: process.env.BETTER_AUTH_SECRET,
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12,
        requireEmailVerification: true,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) =>
          sendMail(user.email, 'Reset your LearnHub password', `Reset your password using this link: ${url}`),
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) =>
          sendMail(user.email, 'Verify your LearnHub email', `Verify your email address using this link: ${url}`),
      },
      user: { additionalFields: { role: { type: 'string', required: false, defaultValue: 'student', input: false } } },
      session: { expiresIn: 604800, updateAge: 3600, cookieCache: { enabled: false } },
      rateLimit: { enabled: true, window: 60, max: 20 },
      advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
        defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
      },
      databaseHooks: {
        user: {
          create: {
            after: async (user: { id: string }) => {
              await pool.query('INSERT INTO profiles(user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id])
            },
          },
        },
        session: {
          create: {
            before: async (session: { userId: string }) => {
              const result = await pool.query<{ status: string }>('SELECT status FROM profiles WHERE user_id=$1', [session.userId])
              if (result.rows[0]?.status === 'disabled') return false
              return { data: session }
            },
            after: async (session: { userId: string }) => {
              await pool.query('UPDATE profiles SET last_login_at=now() WHERE user_id=$1', [session.userId])
              await pool.query("INSERT INTO audit_logs(actor_id,action,target,target_id) VALUES ($1,'auth.login','user',$1)", [
                session.userId,
              ])
            },
          },
        },
      },
    }) as unknown as AuthInstance
  }
  return authInstance
}

export function hasRole(role: string | undefined, allowed: UserRole[]) {
  return Boolean(role && allowed.includes(role as UserRole))
}

export async function getSession(requestHeaders: Headers) {
  return getAuth().api.getSession({ headers: requestHeaders })
}

export async function requireRole(requestHeaders: Headers, allowed: UserRole[]) {
  const session = await getSession(requestHeaders)
  const user = session?.user as LegacyAuthUser | undefined
  if (!user || !hasRole(user.role, allowed)) throw new Error('Forbidden')
  return session
}
