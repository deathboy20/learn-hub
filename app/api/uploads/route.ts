import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { createUpload, completeUpload, scanAndIndex } from '@/lib/server/storage'
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http'
import { z } from 'zod'
export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const actor = await currentActor(), data = await jsonBody(request), mode = new URL(request.url).searchParams.get('mode')
    return NextResponse.json(mode === 'complete' ? await completeUpload(actor, data) : mode === 'scan' ? await scanAndIndex(actor, z.object({ id: z.string().uuid() }).parse(data).id) : await createUpload(actor, data))
  } catch (error) { return apiError(error) }
}
