import 'server-only'
import { AppError } from '@/lib/domain'
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new AppError(503, 'Verification email is not configured. Contact the platform operator.')
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }), signal: AbortSignal.timeout(15000),
  })
  if (!result.ok) throw new AppError(503, 'The email provider could not deliver your message. Try again later.')
}
