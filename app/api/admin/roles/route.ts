import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { listRoles } from '@/lib/server/queries'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    return NextResponse.json(await listRoles(actor))
  } catch (error) {
    return apiError(error)
  }
}
