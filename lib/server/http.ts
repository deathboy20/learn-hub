import 'server-only'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError } from '@/lib/domain'
import { appErrorFromUnknown } from '@/lib/server/pg-errors'

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin
  if (!origin || origin !== expected) throw new AppError(403, 'This request must originate from the application.')
}
export async function jsonBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.length > 150000) throw new AppError(413, 'The request is too large.')
  try { return JSON.parse(text) as unknown } catch { throw new AppError(400, 'Invalid JSON request.') }
}
export function apiError(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status })
  const mapped = appErrorFromUnknown(error)
  if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }, { status: 400 })
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  if (code === '23505') return NextResponse.json({ error: 'A record with those details already exists.' }, { status: 409 })
  if (code === '23503' || code === '23514' || code === '22P02') return NextResponse.json({ error: 'The submitted values conflict with the academic records. Check your selections.' }, { status: 400 })
  console.error(
    JSON.stringify({
      event: 'request.error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: typeof code === 'string' ? code : undefined,
    }),
  )
  return NextResponse.json({ error: 'The service could not complete this request. Please try again.' }, { status: 503 })
}
