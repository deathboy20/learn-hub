'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LearnHubMark } from '@/components/learnhub-mark'
import { homeFor } from '@/lib/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordField } from '@/components/password-field'
import { ThemeToggle } from '@/components/theme-toggle'
import { apiGet } from '@/lib/client/api-fetch'

async function getSupabase() {
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
  return createSupabaseBrowserClient()
}

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const search = useSearchParams()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (cb: () => void) => window.setTimeout(cb, 1)
    const cancel =
      typeof window.cancelIdleCallback === 'function'
        ? window.cancelIdleCallback.bind(window)
        : (id: number) => window.clearTimeout(id)

    const handle = schedule(() => {
      void getSupabase()
        .then(supabase =>
          supabase.auth.getSession().then(({ data }) => {
            if (!data.session) return
            return apiGet<{ actor: { role: string } }>('/api/workspace').then(ws => {
              const next = search.get('next')
              router.replace(next && next.startsWith('/') ? next : homeFor(String(ws.actor.role)))
            })
          }),
        )
        .catch(() => {
          /* stay on auth page */
        })
    })

    return () => {
      cancel(handle)
    }
  }, [router, search])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '')
    const password = String(data.get('password') || '')
    const name = String(data.get('name') || '')
    setError('')
    setPending(true)
    const supabase = await getSupabase()
    try {
      if (mode === 'sign-up') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (signUpError) throw signUpError
        router.push('/verify-email')
        router.refresh()
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      const ws = await apiGet<{ actor: { role: string } }>('/api/workspace')
      const next = search.get('next')
      router.push(next && next.startsWith('/') ? next : homeFor(String(ws.actor.role)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="auth-card relative" onSubmit={submit}>
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="auth-heading flex flex-col items-center">
        <LearnHubMark variant="default" />
        <p className="eyebrow mt-4">LEARNHUB</p>
        <h1>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">Continue your academic journey with a focused learning workspace.</p>
      </div>
      {mode === 'sign-up' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="auth-name">Full name</Label>
          <Input id="auth-name" name="name" required placeholder="Kwame Asante" autoComplete="name" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-email">Email address</Label>
        <Input id="auth-email" name="email" type="email" required placeholder="you@university.edu" autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-password">Password</Label>
        <PasswordField
          id="auth-password"
          name="password"
          required
          minLength={12}
          placeholder="At least 12 characters"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        />
      </div>
      {mode === 'sign-in' && <Link href="/forgot-password" className="text-xs text-primary">Forgot password?</Link>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" className="auth-submit w-full" disabled={pending}>{pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</Button>
      <p className="auth-switch">{mode === 'sign-in' ? 'New to LearnHub?' : 'Already have an account?'}{' '}<Link href={mode === 'sign-in' ? '/register' : '/login'}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link></p>
    </form>
  )
}
