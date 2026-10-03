import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { mutate } from '@/lib/server/mutations'
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http'
export async function POST(request: Request) {
  try { sameOrigin(request); return NextResponse.json(await mutate(await currentActor(), await jsonBody(request))) }
  catch (error) { return apiError(error) }
}
