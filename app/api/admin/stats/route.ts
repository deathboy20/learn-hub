import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { adminStats } from '@/lib/server/queries'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    return NextResponse.json(await adminStats(actor))
  } catch (error) {
    return apiError(error)
  }
}
