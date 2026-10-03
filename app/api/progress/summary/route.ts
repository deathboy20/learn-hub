import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { progressSummaryForActor } from '@/lib/server/progress-summary'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    return NextResponse.json(await progressSummaryForActor(actor))
  } catch (error) {
    return apiError(error)
  }
}
