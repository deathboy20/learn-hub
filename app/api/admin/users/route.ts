import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { listUsers } from '@/lib/server/queries'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    const users = await listUsers(actor)
    return NextResponse.json({ users })
  } catch (error) {
    return apiError(error)
  }
}
