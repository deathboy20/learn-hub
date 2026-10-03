import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { searchContent } from '@/lib/server/queries'
import { apiError } from '@/lib/server/http'

export async function GET(request: Request) {
  try {
    const actor = await currentActor()
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return NextResponse.json(await searchContent(actor, q))
  } catch (error) {
    return apiError(error)
  }
}
