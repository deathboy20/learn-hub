import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { runAIChat } from '@/lib/server/ai/chat'
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http'

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const actor = await currentActor()
    return NextResponse.json(await runAIChat(actor, await jsonBody(request)))
  } catch (error) {
    return apiError(error)
  }
}
