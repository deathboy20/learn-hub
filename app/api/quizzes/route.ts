import { NextResponse } from 'next/server'
import { currentActor } from '@/lib/server/session'
import { quizAction, saveQuiz, quizDetail } from '@/lib/server/quizzes'
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http'

export async function GET(request: Request) {
  try {
    const actor = await currentActor()
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Quiz id required.' }, { status: 400 })
    const author = new URL(request.url).searchParams.get('author') === '1'
    return NextResponse.json(await quizDetail(actor, id, author))
  } catch (error) { return apiError(error) }
}

export async function POST(request: Request) {
  try { sameOrigin(request); const actor = await currentActor(); const data = await jsonBody(request); return NextResponse.json(new URL(request.url).searchParams.get('mode') === 'author' ? await saveQuiz(actor, data) : await quizAction(actor, data)) }
  catch (error) { return apiError(error) }
}
