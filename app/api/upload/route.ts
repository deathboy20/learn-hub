import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { uploadToken } from '@/lib/server/storage'
import { apiError, sameOrigin } from '@/lib/server/http'

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const actor = await currentActor()
    const body = await request.json() as HandleUploadBody
    return NextResponse.json(await handleUpload({ request, body, onBeforeGenerateToken: (pathname, payload) => uploadToken(actor, pathname, payload) }))
  } catch (error) { return apiError(error) }
}
