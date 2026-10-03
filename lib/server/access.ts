import 'server-only'
import type { PoolClient } from 'pg'
import { AppError, allowed, type Actor, type RecordData } from '@/lib/domain'
import { one } from './db'
export async function courseAccess(db: PoolClient, actor: Actor, courseId: string, teaching = false) {
  const course = await one<RecordData>(db, 'SELECT * FROM courses WHERE id=$1', [courseId])
  if (allowed(actor, 'courses.manage')) return course
  const assigned = await db.query("SELECT 1 FROM course_offerings WHERE course_id=$1 AND lecturer_id=$2 AND status='active'", [courseId, actor.id])
  if (assigned.rowCount && actor.role === 'lecturer') return course
  if (!teaching) {
    const enrolled = await db.query(`SELECT 1 FROM enrollments e JOIN course_offerings o ON o.id=e.course_offering_id WHERE e.student_id=$1 AND e.status='active' AND o.course_id=$2 AND o.status='active'`, [actor.id, courseId])
    if (enrolled.rowCount) return course
  }
  throw new AppError(403, teaching ? 'You can manage only your assigned courses.' : 'Enroll in this course to access its learning materials.')
}
export async function resourceAccess(db: PoolClient, actor: Actor, id: string, editing = false) {
  const resource = await one<RecordData>(db, 'SELECT * FROM resources WHERE id=$1', [id])
  if (allowed(actor, 'resources.moderate')) return resource
  if (editing) {
    if (resource.uploaded_by !== actor.id || !allowed(actor, 'resources.write')) throw new AppError(403, 'You can edit only your own resources.')
    await courseAccess(db, actor, String(resource.course_id), true)
  } else if (resource.uploaded_by === actor.id && allowed(actor, 'resources.write')) {
    await courseAccess(db, actor, String(resource.course_id), true)
  } else {
    if (resource.moderation_status !== 'approved' || !['clean', 'not_required'].includes(String(resource.scan_status))) throw new AppError(404, 'This resource is not available.')
    if (resource.visibility !== 'public') await courseAccess(db, actor, String(resource.course_id))
  }
  return resource
}
export async function rateLimit(db: PoolClient, key: string, max: number, seconds: number) {
  const record = await one<{ count: number }>(db, `INSERT INTO request_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_limits.expires_at<now() THEN 1 ELSE request_limits.count+1 END,expires_at=CASE WHEN request_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE request_limits.expires_at END RETURNING count`, [key, seconds])
  if (record.count > max) throw new AppError(429, 'You have reached the request limit. Please try again later.')
}
