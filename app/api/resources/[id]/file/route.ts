import { get } from '@vercel/blob'
import { z } from 'zod'
import { AppError } from '@/lib/domain'
import { currentActor } from '@/lib/server/session'
import { transaction } from '@/lib/server/db'
import { resourceAccess } from '@/lib/server/access'
import { apiError } from '@/lib/server/http'
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentActor(), { id } = await context.params
    z.string().uuid().parse(id)
    const download = new URL(request.url).searchParams.get('download') === '1'
    const resource = await transaction(actor.id, async db => {
      const row = await resourceAccess(db, actor, id)
      if (row.scan_status !== 'clean' && row.scan_status !== 'not_required') throw new AppError(403, 'This file is awaiting a clean malware scan.')
      if (download && !row.allow_download) throw new AppError(403, 'Downloads are disabled for this resource.')
      if (!request.headers.get('range')) await db.query(`INSERT INTO ${download ? 'resource_downloads' : 'resource_views'}(resource_id,user_id) VALUES($1,$2)`, [id, actor.id])
      return row
    })
    if (!resource.storage_path) throw new AppError(404, 'This resource has no stored file.')
    const range = request.headers.get('range')
    if (range && !/^bytes=\d*-\d*$/.test(range)) throw new AppError(416, 'Invalid byte range.')
    const blob = await get(String(resource.storage_path), { access: 'private', headers: range ? { Range: range } : undefined })
    if (!blob || blob.statusCode !== 200) throw new AppError(404, 'The file is unavailable.')
    const headers = new Headers({ 'Content-Type': String(resource.mime_type || 'application/octet-stream'), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(String(resource.title))}` })
    for (const key of ['content-length','content-range']) { const value = blob.headers.get(key); if (value) headers.set(key, value) }
    return new Response(blob.stream, { status: blob.headers.has('content-range') ? 206 : 200, headers })
  } catch (error) { return apiError(error) }
}
