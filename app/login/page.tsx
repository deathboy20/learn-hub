import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <main id="main-content" tabIndex={-1} className="auth-page focus:outline-none">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </main>
  )
}
