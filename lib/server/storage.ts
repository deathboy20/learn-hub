import 'server-only'
import { head, get } from '@vercel/blob'
import { z } from 'zod'
import { AppError, requirePermission, validateUpload, type Actor, type RecordData } from '@/lib/domain'
import { transaction, one, audit } from './db'
import { courseAccess, resourceAccess, rateLimit } from './access'

export async function createUpload(actor: Actor, input: unknown) {
  requirePermission(actor, 'resources.write')
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new AppError(503, 'Private file storage is not configured.')
  const value = z.object({ course_id: z.string().uuid(), name: z.string().min(1).max(200), type: z.string(), size: z.number().int() }).strict().parse(input)
  validateUpload(value.name, value.type, value.size)
  return transaction(actor.id, async db => {
    await rateLimit(db, `upload:${actor.id}`, 20, 3600)
    await courseAccess(db, actor, value.course_id, true)
    const pathname = `resources/${value.course_id}/${crypto.randomUUID()}/${value.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    return one<RecordData>(db, 'INSERT INTO upload_intents(user_id,course_id,pathname,filename,mime_type,file_size) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,pathname', [actor.id, value.course_id, pathname, value.name, value.type, value.size])
  })
}
export async function uploadToken(actor: Actor, pathname: string, payload: string | null) {
  requirePermission(actor, 'resources.write')
  const { id } = z.object({ id: z.string().uuid() }).parse(JSON.parse(payload ?? '{}') as unknown)
  return transaction(actor.id, async db => {
    const intent = await one<RecordData>(db, 'SELECT * FROM upload_intents WHERE id=$1 AND user_id=$2 AND completed_at IS NULL AND expires_at>now()', [id, actor.id])
    await courseAccess(db, actor, String(intent.course_id), true)
    if (intent.pathname !== pathname) throw new AppError(403, 'This upload path is not authorized.')
    return { allowedContentTypes: [String(intent.mime_type)], maximumSizeInBytes: Number(intent.file_size), validUntil: Date.now() + 3600000, addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ id, userId: actor.id }) }
  })
}
export async function completeUpload(actor: Actor, input: unknown) {
  requirePermission(actor, 'resources.write')
  const value = z.object({ intent_id: z.string().uuid(), resource_id: z.string().uuid().optional(), title: z.string().trim().min(1).max(250), description: z.string().max(10000), category: z.string().min(1).max(100), academic_term_id: z.string().uuid().nullable(), allow_download: z.boolean(), visibility: z.enum(['enrolled','public']), submit: z.boolean() }).strict().parse(input)
  return transaction(actor.id, async db => {
    const intent = await one<RecordData>(db, 'SELECT * FROM upload_intents WHERE id=$1 AND user_id=$2 AND completed_at IS NULL AND expires_at>now() FOR UPDATE', [value.intent_id, actor.id])
    await courseAccess(db, actor, String(intent.course_id), true)
    const metadata = await head(String(intent.pathname))
    if (metadata.size !== Number(intent.file_size) || metadata.contentType !== intent.mime_type || !new URL(metadata.url).hostname.endsWith('.private.blob.vercel-storage.com')) throw new AppError(400, 'Uploaded object metadata or private storage configuration is invalid.')
    const type = validateUpload(String(intent.filename), metadata.contentType, metadata.size)
    const developmentBypass = process.env.NODE_ENV !== 'production' && process.env.ALLOW_UNSCANNED_DEMO_UPLOADS === 'true'
    const status = value.submit ? 'pending' : 'draft'
    let result: RecordData
    if (value.resource_id) {
      const previous = await resourceAccess(db, actor, value.resource_id, true)
      if (previous.course_id !== intent.course_id) throw new AppError(400, 'Replacement files must belong to the same course.')
      result = await one<RecordData>(db, `UPDATE resources SET title=$2,description=$3,category=$4,storage_path=$5,mime_type=$6,file_size=$7,type=$8,version=version+1,moderation_status=$9,scan_status=$10,extracted_text='',updated_at=now() WHERE id=$1 RETURNING *`, [value.resource_id, value.title, value.description, value.category, intent.pathname, intent.mime_type, intent.file_size, type, status, developmentBypass ? 'clean' : 'pending'])
      await db.query('DELETE FROM document_chunks WHERE resource_id=$1', [value.resource_id])
    } else result = await one<RecordData>(db, `INSERT INTO resources(course_id,uploaded_by,title,description,type,category,storage_path,file_size,mime_type,academic_term_id,allow_download,visibility,moderation_status,scan_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`, [intent.course_id, actor.id, value.title, value.description, type, value.category, intent.pathname, intent.file_size, intent.mime_type, value.academic_term_id, value.allow_download, value.visibility, status, developmentBypass ? 'clean' : 'pending'])
    await db.query('INSERT INTO resource_versions(resource_id,version,storage_path,file_size,created_by) VALUES($1,$2,$3,$4,$5)', [result.id, result.version, intent.pathname, intent.file_size, actor.id])
    await db.query('UPDATE upload_intents SET completed_at=now() WHERE id=$1', [value.intent_id])
    await audit(db, actor.id, 'resource.upload', 'resource', String(result.id), { scanBypass: developmentBypass })
    return { id: result.id, scan_status: result.scan_status }
  })
}
export async function scanAndIndex(actor: Actor, id: string) {
  requirePermission(actor, 'resources.write')
  const resource = await transaction(actor.id, db => resourceAccess(db, actor, id, true))
  if (!resource.storage_path) throw new AppError(400, 'This resource has no file.')
  const blob = await get(String(resource.storage_path), { access: 'private' })
  if (!blob || blob.statusCode !== 200) throw new AppError(404, 'The file is missing from storage.')
  if (Number(resource.file_size) > 50 * 1024 * 1024) throw new AppError(413, 'Large videos require the external scanning worker. Configure the scanner webhook integration.')
  const buffer = await new Response(blob.stream).arrayBuffer()
  let clean = process.env.NODE_ENV !== 'production' && process.env.ALLOW_UNSCANNED_DEMO_UPLOADS === 'true'
  if (process.env.MALWARE_SCANNER_URL && process.env.MALWARE_SCANNER_TOKEN) {
    const response = await fetch(process.env.MALWARE_SCANNER_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.MALWARE_SCANNER_TOKEN}`, 'Content-Type': 'application/octet-stream' }, body: buffer, signal: AbortSignal.timeout(60000) })
    if (!response.ok) throw new AppError(503, 'The file scanner could not complete this request.')
    clean = z.object({ clean: z.boolean() }).parse(await response.json()).clean
  } else if (!clean) throw new AppError(503, 'Configure the malware scanner before reviewing uploaded files.')
  let extracted = ''
  if (clean && resource.mime_type === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try { extracted = (await parser.getText()).text.slice(0, 500000) } finally { await parser.destroy() }
  } else if (clean && resource.mime_type === 'text/plain') extracted = new TextDecoder().decode(buffer).slice(0, 500000)
  await transaction(actor.id, async db => {
    const latest = await resourceAccess(db, actor, id, true)
    if (latest.storage_path !== resource.storage_path) throw new AppError(409, 'The resource changed during scanning. Scan the current version.')
    await db.query('UPDATE resources SET scan_status=$2,extracted_text=$3,updated_at=now() WHERE id=$1', [id, clean ? 'clean' : 'blocked', extracted])
    await db.query('DELETE FROM document_chunks WHERE resource_id=$1', [id])
    for (let offset = 0; offset < extracted.length; offset += 1800) await db.query('INSERT INTO document_chunks(resource_id,content,position) VALUES($1,$2,$3)', [id, extracted.slice(offset, offset + 2200), offset / 1800])
    await audit(db, actor.id, clean ? 'resource.scan.clean' : 'resource.scan.blocked', 'resource', id)
  })
  return { clean, indexed: Boolean(extracted) }
}
