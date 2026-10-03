'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [done, setDone] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password'))
    await authClient.resetPassword({ token, newPassword: password })
    setDone(true)
  }
  if (done) return <p className="auth-card">Password updated. <Link href="/login">Sign in</Link></p>
  return (
    <form className="auth-card" onSubmit={submit}>
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <Input name="password" type="password" minLength={12} required />
      <Button type="submit" className="w-full">Update password</Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return <main className="auth-page"><Suspense><ResetForm /></Suspense></main>
}
