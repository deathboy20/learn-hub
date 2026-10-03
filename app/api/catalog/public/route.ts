import { NextResponse } from 'next/server'
import { publicCatalogue } from '@/lib/server/queries'
import { apiError } from '@/lib/server/http'

export async function GET() {
  try {
    return NextResponse.json(await publicCatalogue())
  } catch (error) {
    return apiError(error)
  }
}
