import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { generatePracticeFromText, listPracticeQuizzes, savePracticeQuiz } from '@/lib/server/practice'
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http'

export async function GET() {
  try {
    const actor = await currentActor()
    return NextResponse.json({ saved: await listPracticeQuizzes(actor) })
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const actor = await currentActor()
    const body = await jsonBody(request)
    const mode = new URL(request.url).searchParams.get('mode')
    if (mode === 'generate') return NextResponse.json(await generatePracticeFromText(actor, body))
    if (mode === 'save') return NextResponse.json(await savePracticeQuiz(actor, body))
    return NextResponse.json({ error: 'Unknown mode.' }, { status: 400 })
  } catch (error) {
    return apiError(error)
  }
}
