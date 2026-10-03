'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { LearnHubMark } from '@/components/learnhub-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email'))
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setMessage('If an account exists, a reset link has been sent.')
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <LearnHubMark variant="default" />
        <h1 className="text-xl font-bold">Reset password</h1>
        <Input name="email" type="email" required placeholder="Email" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" className="w-full">Send reset link</Button>
        <Link href="/login" className="text-center text-sm text-primary">Back to sign in</Link>
      </form>
    </main>
  )
}
