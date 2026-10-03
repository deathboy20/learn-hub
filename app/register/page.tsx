import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'

export const metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </main>
  )
}
