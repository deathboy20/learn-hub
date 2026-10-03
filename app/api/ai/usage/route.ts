import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { aiUsageForActor } from '@/lib/server/ai/usage'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    return NextResponse.json(await aiUsageForActor(actor))
  } catch (error) {
    return apiError(error)
  }
}
