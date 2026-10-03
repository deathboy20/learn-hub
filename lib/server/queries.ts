import 'server-only'
import { allowed, AppError, requirePermission, type Actor, type RecordData } from '@/lib/domain'
import { one, rows, transaction } from './db'

export type WorkspaceData = { actor: Actor; courses: RecordData[]; offerings: RecordData[]; resources: RecordData[]; quizzes: RecordData[]; attempts: RecordData[]; announcements: RecordData[]; notifications: RecordData[]; events: RecordData[]; bookmarks: RecordData[]; progress: RecordData[]; notes: RecordData[]; programmes: RecordData[]; terms: RecordData[]; activity: RecordData[]; faculties: RecordData[]; departments: RecordData[]; levels: RecordData[] }
export async function workspaceData(actor: Actor): Promise<WorkspaceData> {
  return transaction(actor.id, async (db) => {
    const manager = allowed(actor, 'courses.manage')
    const params = [actor.id, manager]
    const courseScope = `($2::boolean OR EXISTS(SELECT 1 FROM course_offerings o WHERE o.course_id=c.id AND o.status='active' AND (o.lecturer_id=$1 OR EXISTS(SELECT 1 FROM enrollments e WHERE e.course_offering_id=o.id AND e.student_id=$1 AND e.status='active'))))`
    const courses = await rows<RecordData>(db, `SELECT c.*,d.name department_name FROM courses c JOIN departments d ON d.id=c.department_id WHERE ${courseScope} ORDER BY c.code`, params)
    const offerings = await rows<RecordData>(db, `SELECT o.*, c.code,c.title,t.name term_name,u.name lecturer_name,(SELECT count(*) FROM enrollments e WHERE e.course_offering_id=o.id AND e.status='active') enrolled_count,EXISTS(SELECT 1 FROM enrollments e WHERE e.course_offering_id=o.id AND e.student_id=$1 AND e.status='active') enrolled FROM course_offerings o JOIN courses c ON c.id=o.course_id JOIN academic_terms t ON t.id=o.academic_term_id JOIN "user" u ON u.id=o.lecturer_id WHERE o.status='active' ORDER BY c.code`, [actor.id])
    const resources = await rows<RecordData>(db, `SELECT r.id,r.course_id,r.uploaded_by,r.title,r.description,r.type,r.category,r.file_size,r.mime_type,r.version,r.moderation_status,r.moderation_notes,r.visibility,r.allow_download,r.scan_status,r.created_at,r.updated_at,c.code,c.level,c.department_id,u.name uploader_name,(SELECT count(*) FROM resource_views v WHERE v.resource_id=r.id) view_count,(SELECT count(*) FROM resource_downloads v WHERE v.resource_id=r.id) download_count FROM resources r JOIN courses c ON c.id=r.course_id JOIN "user" u ON u.id=r.uploaded_by WHERE ($3::boolean OR (r.uploaded_by=$1 AND EXISTS(SELECT 1 FROM course_offerings o WHERE o.course_id=r.course_id AND o.lecturer_id=$1)) OR (r.moderation_status='approved' AND r.scan_status IN ('clean','not_required') AND (r.visibility='public' OR ${courseScope}))) ORDER BY r.created_at DESC LIMIT 500`, [...params, allowed(actor, 'resources.moderate')])
    const quizzes = await rows<RecordData>(db, `SELECT q.*,c.code,(SELECT count(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) question_count FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE ${courseScope} AND (q.status='published' OR $2::boolean OR EXISTS(SELECT 1 FROM course_offerings o WHERE o.course_id=q.course_id AND o.lecturer_id=$1)) ORDER BY q.created_at DESC`, params)
    const attempts = await rows<RecordData>(db, 'SELECT a.*,q.title FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE a.user_id=$1 ORDER BY a.started_at DESC LIMIT 100', [actor.id])
    const announcements = await rows<RecordData>(db, `SELECT a.*,c.code FROM announcements a LEFT JOIN courses c ON c.id=a.course_id WHERE ($2::boolean OR a.created_by=$1 OR ((a.status='published' OR (a.status='scheduled' AND a.publish_at<=now())) AND (a.course_id IS NULL OR ${courseScope}) AND (a.programme_id IS NULL OR a.programme_id=$3) AND (a.department_id IS NULL OR a.department_id=$4) AND (a.level IS NULL OR a.level=$5))) ORDER BY a.created_at DESC LIMIT 100`, [...params, actor.programme_id, actor.department_id, actor.level])
    const notifications = await rows<RecordData>(db, 'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [actor.id])
    const events = await rows<RecordData>(db, `SELECT e.* FROM calendar_events e LEFT JOIN courses c ON c.id=e.course_id WHERE e.created_by=$1 OR e.visibility='global' OR (e.visibility='course' AND ${courseScope}) ORDER BY e.starts_at LIMIT 500`, params)
    const bookmarks = await rows<RecordData>(db, 'SELECT * FROM bookmarks WHERE user_id=$1', [actor.id])
    const progress = await rows<RecordData>(db, 'SELECT * FROM progress WHERE user_id=$1', [actor.id])
    const notes = await rows<RecordData>(db, 'SELECT * FROM notes WHERE user_id=$1 ORDER BY updated_at DESC', [actor.id])
    const programmes = await rows<RecordData>(db, "SELECT * FROM programmes WHERE status='active' ORDER BY name")
    const terms = await rows<RecordData>(db, "SELECT * FROM academic_terms WHERE status='active' ORDER BY start_date DESC")
    const activity = await rows<RecordData>(db, `SELECT to_char(created_at,'YYYY-MM-DD') date,count(*)::int views FROM resource_views WHERE user_id=$1 AND created_at>=now()-interval '14 days' GROUP BY 1 ORDER BY 1`, [actor.id])
    const faculties = manager ? await rows<RecordData>(db, 'SELECT * FROM faculties ORDER BY name') : []
    const departments = manager ? await rows<RecordData>(db, 'SELECT * FROM departments ORDER BY name') : []
    const levels = manager ? await rows<RecordData>(db, 'SELECT * FROM academic_levels ORDER BY value') : []
    return { actor, courses, offerings, resources, quizzes, attempts, announcements, notifications, events, bookmarks, progress, notes, programmes, terms, activity, faculties, departments, levels }
  })
}
export { publicCatalogue, publicCourse } from './public-catalogue'

export async function adminStats(actor: Actor) {
  if (!allowed(actor, 'reports.read') && !allowed(actor, 'courses.manage')) throw new AppError(403, 'You do not have permission to view admin statistics.')
  return transaction(actor.id, async db => ({
    users: await one<{ total: string; students: string; lecturers: string; admins: string }>(db, `SELECT count(*) total, count(*) FILTER (WHERE role='student') students, count(*) FILTER (WHERE role='lecturer') lecturers, count(*) FILTER (WHERE role IN ('admin','super_admin')) admins FROM "user"`),
    resources: await one<{ total: string; pending: string }>(db, "SELECT count(*) total, count(*) FILTER (WHERE moderation_status='pending') pending FROM resources"),
    courses: await one<{ total: string }>(db, "SELECT count(*) total FROM courses WHERE status='active'"),
    enrollments: await one<{ total: string }>(db, "SELECT count(*) total FROM enrollments WHERE status='active'"),
    views: await one<{ total: string }>(db, 'SELECT count(*) total FROM resource_views'),
    downloads: await one<{ total: string }>(db, 'SELECT count(*) total FROM resource_downloads'),
    quizzes: await one<{ total: string }>(db, "SELECT count(*) total FROM quizzes WHERE status='published'"),
    growth: await rows<RecordData>(db, "SELECT to_char(\"createdAt\",'YYYY-MM-DD') date,count(*)::int count FROM \"user\" WHERE \"createdAt\">=now()-interval '30 days' GROUP BY 1 ORDER BY 1"),
  }))
}

export async function searchContent(actor: Actor, q: string, limit = 20) {
  const term = `%${q.trim().slice(0, 120)}%`
  if (!q.trim()) return { courses: [], resources: [], quizzes: [], announcements: [] }
  return transaction(actor.id, async db => {
    const params = [actor.id, term, limit]
    const manager = allowed(actor, 'courses.manage')
    const courseScope = `($4::boolean OR EXISTS(SELECT 1 FROM course_offerings o WHERE o.course_id=c.id AND o.status='active' AND (o.lecturer_id=$1 OR EXISTS(SELECT 1 FROM enrollments e WHERE e.course_offering_id=o.id AND e.student_id=$1 AND e.status='active'))))`
    return {
      courses: await rows<RecordData>(db, `SELECT c.id,c.code,c.title FROM courses c WHERE c.status='active' AND (c.code ILIKE $2 OR c.title ILIKE $2 OR c.description ILIKE $2) AND ${courseScope} LIMIT $3`, [...params, manager]),
      resources: await rows<RecordData>(db, `SELECT r.id,r.title,r.type,c.code FROM resources r JOIN courses c ON c.id=r.course_id WHERE (r.title ILIKE $2 OR r.description ILIKE $2) AND ($4::boolean OR r.moderation_status='approved') LIMIT $3`, [...params, manager]),
      quizzes: await rows<RecordData>(db, `SELECT q.id,q.title,c.code FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.title ILIKE $2 AND ($4::boolean OR q.status='published') LIMIT $3`, [...params, manager]),
      announcements: await rows<RecordData>(db, `SELECT a.id,a.title FROM announcements a WHERE a.title ILIKE $2 OR a.body ILIKE $2 LIMIT $3`, [actor.id, term, limit]),
    }
  })
}

export async function listUsers(actor: Actor) {
  requirePermission(actor, 'users.read')
  return transaction(actor.id, async db => rows<RecordData>(db, `SELECT u.id,u.name,u.email,u.role,p.status,p.programme_id,p.level FROM "user" u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY u."createdAt" DESC LIMIT 500`))
}

export async function listAudit(actor: Actor, limit = 200) {
  requirePermission(actor, 'audit.read')
  return transaction(actor.id, async db => rows<RecordData>(db, `SELECT a.*,u.name actor_name FROM audit_logs a LEFT JOIN "user" u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT $1`, [limit]))
}

export async function listRoles(actor: Actor) {
  requirePermission(actor, 'system.manage')
  return transaction(actor.id, async db => ({
    roles: await rows<RecordData>(db, 'SELECT * FROM roles ORDER BY name'),
    permissions: await rows<RecordData>(db, 'SELECT * FROM permissions ORDER BY key'),
    rolePermissions: await rows<RecordData>(db, 'SELECT * FROM role_permissions ORDER BY role,permission_key'),
    settings: await rows<RecordData>(db, 'SELECT * FROM system_settings ORDER BY key'),
    flags: await rows<RecordData>(db, 'SELECT * FROM feature_flags ORDER BY key'),
  }))
}
