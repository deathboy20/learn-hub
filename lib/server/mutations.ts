import 'server-only'
import { z } from 'zod'
import type { PoolClient } from 'pg'
import { AppError, allowed, requirePermission, roles, transitionResource, type Actor, type RecordData } from '@/lib/domain'
import { catalogs } from '@/lib/catalog'
import { audit, one, rows, transaction } from './db'
import { courseAccess, resourceAccess, rateLimit } from './access'
const uuid = z.string().uuid()
const text = z.string().trim().min(1).max(250)
const body = z.string().trim().min(1).max(20000)
const envelope = z.object({ action: z.string(), data: z.record(z.string(), z.unknown()) }).strict()

export async function notifyCourse(db: PoolClient, courseId: string | null, title: string, message: string, href: string) {
  await db.query(`INSERT INTO notifications(user_id,title,body,href) SELECT DISTINCT u.id,$2,$3,$4 FROM "user" u JOIN profiles p ON p.user_id=u.id WHERE p.status='active' AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM enrollments e JOIN course_offerings o ON o.id=e.course_offering_id WHERE e.student_id=u.id AND e.status='active' AND o.course_id=$1))`, [courseId, title, message, href])
}
export async function mutate(actor: Actor, input: unknown) {
  const { action, data } = envelope.parse(input)
  return transaction(actor.id, async db => {
    await rateLimit(db, `mutation:${actor.id}`, 120, 60)
    switch (action) {
      case 'catalog.save': {
        const value = z.object({ collection: z.string(), id: uuid.optional(), values: z.record(z.string(), z.unknown()) }).strict().parse(data)
        const config = catalogs[value.collection]
        if (!config) throw new AppError(404, 'Unknown catalogue.')
        requirePermission(actor, config.permission)
        const parsed: Record<string, unknown> = {}
        for (const field of config.fields) {
          const raw = value.values[field.key]
          let validator: z.ZodType = field.type === 'number' ? z.coerce.number().int().min(1).max(10000) : field.source ? z.string().min(1).max(128) : field.options ? z.enum(field.options as [string, ...string[]]) : z.string().trim().max(field.type === 'textarea' ? 10000 : 250)
          if (field.required && !field.source && field.type !== 'number') validator = z.string().trim().min(1).max(250)
          parsed[field.key] = validator.parse(raw ?? '')
        }
        if (value.collection === 'course-offerings') {
          const lecturer = await one<{ role: string }>(db, 'SELECT role FROM "user" WHERE id=$1', [parsed.lecturer_id])
          if (lecturer.role !== 'lecturer') throw new AppError(400, 'Select a lecturer account for this offering.')
        }
        const keys = Object.keys(parsed)
        const values = Object.values(parsed)
        const record = value.id
          ? await one<RecordData>(db, `UPDATE ${config.table} SET ${keys.map((key, i) => `${key}=$${i + 1}`).join(',')},updated_at=now() WHERE id=$${keys.length + 1} RETURNING *`, [...values, value.id])
          : await one<RecordData>(db, `INSERT INTO ${config.table}(${keys.join(',')}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, values)
        await audit(db, actor.id, value.id ? 'catalog.update' : 'catalog.create', config.table, String(record.id))
        return record
      }
      case 'catalog.delete': {
        const value = z.object({ collection: z.string(), id: uuid }).strict().parse(data)
        const config = catalogs[value.collection]
        if (!config) throw new AppError(404, 'Unknown catalogue.')
        requirePermission(actor, config.permission)
        try {
          await one<RecordData>(db, `DELETE FROM ${config.table} WHERE id=$1 RETURNING id`, [value.id])
        } catch {
          throw new AppError(
            409,
            'This record is still linked to other data (offerings, resources, or enrollments). Remove dependents first or archive it instead.',
          )
        }
        await audit(db, actor.id, 'catalog.delete', config.table, value.id)
        return { deleted: true }
      }
      case 'enroll': {
        const { offering_id } = z.object({ offering_id: uuid }).strict().parse(data)
        const offering = await one<RecordData>(db, "SELECT * FROM course_offerings WHERE id=$1 AND status='active' FOR UPDATE", [offering_id])
        const existing = await rows<RecordData>(db, 'SELECT * FROM enrollments WHERE student_id=$1 AND course_offering_id=$2', [actor.id, offering_id])
        if (existing[0]?.status === 'active') return existing[0]
        const count = await one<{ count: string }>(db, "SELECT count(*) FROM enrollments WHERE course_offering_id=$1 AND status='active'", [offering_id])
        if (Number(count.count) >= Number(offering.capacity)) throw new AppError(409, 'This course offering is full.')
        const record = await one<RecordData>(db, "INSERT INTO enrollments(student_id,course_offering_id) VALUES($1,$2) ON CONFLICT(student_id,course_offering_id) DO UPDATE SET status='active' RETURNING *", [actor.id, offering_id])
        await db.query("INSERT INTO notifications(user_id,title,body,href) VALUES($1,'Enrollment confirmed','Your course is ready in My courses.','/my-courses')", [actor.id])
        await audit(db, actor.id, 'course.enroll', 'course_offering', offering_id)
        return record
      }
      case 'resource.moderate': {
        const value = z.object({ id: uuid, status: z.enum(['draft','pending','approved','rejected','correction_required','archived']), notes: z.string().max(4000).default(''), visibility: z.enum(['public','enrolled']).optional() }).strict().parse(data)
        const resource = await resourceAccess(db, actor, value.id, true)
        await db.query('SELECT id FROM resources WHERE id=$1 FOR UPDATE', [value.id])
        const locked = await one<RecordData>(db, 'SELECT * FROM resources WHERE id=$1', [value.id])
        const moderator = allowed(actor, 'resources.moderate')
        transitionResource(String(locked.moderation_status), value.status, moderator)
        if (['approved','rejected','correction_required'].includes(value.status)) requirePermission(actor, 'resources.moderate')
        if (value.status === 'approved' && !['clean','not_required'].includes(String(locked.scan_status))) throw new AppError(409, 'This upload must pass malware scanning before approval.')
        if (['rejected','correction_required'].includes(value.status) && !value.notes.trim()) throw new AppError(400, 'Explain the corrections or rejection for the lecturer.')
        await db.query('UPDATE resources SET moderation_status=$2,moderation_notes=$3,visibility=COALESCE($4,visibility),updated_at=now() WHERE id=$1', [value.id, value.status, value.notes, moderator ? value.visibility : null])
        await audit(db, actor.id, `resource.${value.status}`, 'resource', value.id, { notes: value.notes })
        await db.query('INSERT INTO notifications(user_id,title,body,href) VALUES($1,$2,$3,$4)', [resource.uploaded_by, `Resource ${value.status.replaceAll('_',' ')}`, value.notes, `/resources/${value.id}`])
        if (value.status === 'approved') await notifyCourse(db, String(resource.course_id), 'New learning resource', String(resource.title), `/resources/${value.id}`)
        return { id: value.id }
      }
      case 'resource.draft': {
        requirePermission(actor, 'resources.write')
        const value = z
          .object({
            course_id: uuid,
            title: text,
            description: z.string().max(10000).default(''),
            category: text.default('Lecture Notes'),
          })
          .strict()
          .parse(data)
        await courseAccess(db, actor, value.course_id, true)
        const result = await one<RecordData>(
          db,
          `INSERT INTO resources(course_id,uploaded_by,title,description,type,category,storage_path,file_size,mime_type,moderation_status,scan_status,visibility)
           VALUES ($1,$2,$3,$4,'document',$5,NULL,0,NULL,'draft','not_required','enrolled') RETURNING *`,
          [value.course_id, actor.id, value.title, value.description, value.category],
        )
        await audit(db, actor.id, 'resource.draft', 'resource', String(result.id))
        return result
      }
      case 'resource.delete': {
        const { id } = z.object({ id: uuid }).strict().parse(data)
        const resource = await one<RecordData>(db, 'SELECT * FROM resources WHERE id=$1', [id])
        const moderator = allowed(actor, 'resources.moderate')
        const owner = String(resource.uploaded_by) === actor.id
        const deletableStatus = ['rejected', 'archived', 'draft', 'correction_required'].includes(
          String(resource.moderation_status),
        )
        if (!moderator && !(owner && deletableStatus)) {
          throw new AppError(403, 'You can only delete your own draft or rejected uploads.')
        }
        if (moderator && !deletableStatus && !owner) {
          throw new AppError(409, 'Reject or archive this resource before deleting it.')
        }
        await db.query('DELETE FROM resource_views WHERE resource_id=$1', [id])
        await db.query('DELETE FROM progress WHERE resource_id=$1', [id])
        await db.query('DELETE FROM resource_versions WHERE resource_id=$1', [id])
        await db.query('DELETE FROM bookmarks WHERE resource_id=$1', [id])
        await db.query('DELETE FROM resources WHERE id=$1', [id])
        await audit(db, actor.id, 'resource.delete', 'resource', id)
        return { deleted: true }
      }
      case 'resource.edit': {
        const value = z.object({ id: uuid, title: text, description: z.string().max(10000), category: text, allow_download: z.boolean(), visibility: z.enum(['public','enrolled']) }).strict().parse(data)
        await resourceAccess(db, actor, value.id, true)
        await db.query("UPDATE resources SET title=$2,description=$3,category=$4,allow_download=$5,visibility=$6,moderation_status='draft',updated_at=now() WHERE id=$1", [value.id, value.title, value.description, value.category, value.allow_download, value.visibility])
        await audit(db, actor.id, 'resource.edit', 'resource', value.id)
        return { id: value.id }
      }
      case 'bookmark': {
        const value = z.object({ resource_id: uuid.optional(), course_id: uuid.optional(), saved: z.boolean() }).strict().refine(v => Boolean(v.resource_id) !== Boolean(v.course_id)).parse(data)
        if (value.resource_id) await resourceAccess(db, actor, value.resource_id)
        if (value.course_id) await courseAccess(db, actor, value.course_id)
        const key = value.resource_id ? 'resource_id' : 'course_id'
        if (value.saved) await db.query(`INSERT INTO bookmarks(user_id,${key}) VALUES($1,$2) ON CONFLICT DO NOTHING`, [actor.id, value.resource_id ?? value.course_id])
        else await db.query(`DELETE FROM bookmarks WHERE user_id=$1 AND ${key}=$2`, [actor.id, value.resource_id ?? value.course_id])
        return { saved: value.saved }
      }
      case 'progress': {
        const value = z.object({ resource_id: uuid, percentage: z.number().min(0).max(100), playback_position: z.number().min(0).max(86400).default(0), completed: z.boolean().default(false) }).strict().parse(data)
        await resourceAccess(db, actor, value.resource_id)
        await db.query('INSERT INTO progress(user_id,resource_id,percentage,playback_position,completed) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,resource_id) DO UPDATE SET percentage=GREATEST(progress.percentage,EXCLUDED.percentage),playback_position=EXCLUDED.playback_position,completed=progress.completed OR EXCLUDED.completed,updated_at=now()', [actor.id, value.resource_id, value.completed ? 100 : value.percentage, value.playback_position, value.completed])
        return { saved: true }
      }
      case 'notification.read': {
        const { id } = z.object({ id: uuid.optional() }).strict().parse(data)
        await db.query('UPDATE notifications SET read_at=now() WHERE user_id=$1 AND ($2::uuid IS NULL OR id=$2)', [actor.id, id ?? null])
        return { saved: true }
      }
      case 'note.save': {
        const value = z.object({ id: uuid.optional(), title: text, body, resource_id: uuid.nullable().optional(), course_id: uuid.nullable().optional() }).strict().parse(data)
        if (value.resource_id) await resourceAccess(db, actor, value.resource_id)
        if (value.course_id) await courseAccess(db, actor, value.course_id)
        return value.id ? one<RecordData>(db, 'UPDATE notes SET title=$3,body=$4,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [value.id, actor.id, value.title, value.body]) : one<RecordData>(db, 'INSERT INTO notes(user_id,title,body,resource_id,course_id) VALUES($1,$2,$3,$4,$5) RETURNING *', [actor.id, value.title, value.body, value.resource_id, value.course_id])
      }
      case 'note.delete': {
        const { id } = z.object({ id: uuid }).strict().parse(data)
        return one<RecordData>(db, 'DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING id', [id, actor.id])
      }
      case 'event.save': {
        const value = z.object({ id: uuid.optional(), title: text, description: z.string().max(5000).default(''), starts_at: z.string().datetime(), ends_at: z.string().datetime(), kind: z.enum(['study','quiz','assignment','lecture','deadline']), visibility: z.enum(['private','course','global']), course_id: uuid.nullable().optional() }).strict().parse(data)
        if (new Date(value.ends_at) < new Date(value.starts_at)) throw new AppError(400, 'The end must follow the start.')
        if (value.visibility === 'global') requirePermission(actor, 'courses.manage')
        if (value.visibility === 'course') { if (!value.course_id) throw new AppError(400, 'Choose a course.'); await courseAccess(db, actor, value.course_id, true) }
        if (value.id) {
          const old = await one<RecordData>(db, 'SELECT * FROM calendar_events WHERE id=$1', [value.id])
          if (old.created_by !== actor.id && !allowed(actor, 'courses.manage')) throw new AppError(403, 'You cannot edit this event.')
        }
        const values = [value.title, value.description, value.starts_at, value.ends_at, value.kind, value.visibility, value.course_id ?? null]
        return value.id ? one<RecordData>(db, 'UPDATE calendar_events SET title=$1,description=$2,starts_at=$3,ends_at=$4,kind=$5,visibility=$6,course_id=$7,updated_at=now() WHERE id=$8 RETURNING *', [...values, value.id]) : one<RecordData>(db, 'INSERT INTO calendar_events(title,description,starts_at,ends_at,kind,visibility,course_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [...values, actor.id])
      }
      case 'event.delete': {
        const { id } = z.object({ id: uuid }).strict().parse(data)
        return one<RecordData>(db, 'DELETE FROM calendar_events WHERE id=$1 AND (created_by=$2 OR $3::boolean) RETURNING id', [id, actor.id, allowed(actor, 'courses.manage')])
      }
      case 'event.complete': {
        const { id } = z.object({ id: uuid }).strict().parse(data)
        return one<RecordData>(
          db,
          'UPDATE calendar_events SET completed_at=now(), updated_at=now() WHERE id=$1 AND created_by=$2 RETURNING *',
          [id, actor.id],
        )
      }
      case 'announcement.save': {
        requirePermission(actor, 'announcements.manage')
        const value = z.object({ id: uuid.optional(), title: text, body, course_id: uuid.nullable().optional(), programme_id: uuid.nullable().optional(), department_id: uuid.nullable().optional(), level: z.number().int().nullable().optional(), status: z.enum(['draft','published','scheduled','archived']), publish_at: z.string().datetime().nullable().optional() }).strict().parse(data)
        if (!allowed(actor, 'courses.manage')) {
          if (!value.course_id || value.programme_id || value.department_id || value.level) throw new AppError(403, 'Lecturers publish only to their assigned courses.')
          await courseAccess(db, actor, value.course_id, true)
          if (value.id) { const old = await one<RecordData>(db, 'SELECT * FROM announcements WHERE id=$1', [value.id]); if (old.created_by !== actor.id) throw new AppError(403, 'You can edit only your own announcements.') }
        }
        if (value.status === 'scheduled' && (!value.publish_at || new Date(value.publish_at) <= new Date())) throw new AppError(400, 'Choose a future publication date.')
        const values = [value.title, value.body, value.course_id ?? null, value.programme_id ?? null, value.department_id ?? null, value.level ?? null, value.status, value.publish_at ?? null]
        const result = value.id ? await one<RecordData>(db, 'UPDATE announcements SET title=$1,body=$2,course_id=$3,programme_id=$4,department_id=$5,level=$6,status=$7,publish_at=$8,updated_at=now() WHERE id=$9 RETURNING *', [...values, value.id]) : await one<RecordData>(db, 'INSERT INTO announcements(title,body,course_id,programme_id,department_id,level,status,publish_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [...values, actor.id])
        // Notification recipients must match all audience dimensions.
        if (value.status === 'published') await db.query(`INSERT INTO notifications(user_id,title,body,href) SELECT DISTINCT u.id,$1,'A new announcement is available.','/announcements' FROM "user" u JOIN profiles p ON p.user_id=u.id WHERE p.status='active' AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM enrollments e JOIN course_offerings o ON o.id=e.course_offering_id WHERE e.student_id=u.id AND e.status='active' AND o.course_id=$2)) AND ($3::uuid IS NULL OR p.programme_id=$3) AND ($4::uuid IS NULL OR p.department_id=$4) AND ($5::integer IS NULL OR p.level=$5)`, [value.title, value.course_id ?? null, value.programme_id ?? null, value.department_id ?? null, value.level ?? null])
        await audit(db, actor.id, `announcement.${value.status}`, 'announcement', String(result.id))
        return result
      }
      case 'announcement.delete': {
        requirePermission(actor, 'announcements.manage')
        const { id } = z.object({ id: uuid }).strict().parse(data)
        const row = await one<RecordData>(db, 'SELECT created_by FROM announcements WHERE id=$1', [id])
        if (!allowed(actor, 'courses.manage') && String(row.created_by) !== actor.id) {
          throw new AppError(403, 'You can delete only your own announcements.')
        }
        await db.query('DELETE FROM announcements WHERE id=$1', [id])
        await audit(db, actor.id, 'announcement.delete', 'announcement', id)
        return { deleted: true }
      }
      case 'profile.save': {
        const value = z.object({ name: text, bio: z.string().max(3000), programme_id: uuid.nullable(), level: z.number().int().min(100).max(900).nullable() }).strict().parse(data)
        await db.query('UPDATE "user" SET name=$2,"updatedAt"=now() WHERE id=$1', [actor.id, value.name])
        await db.query('INSERT INTO profiles(user_id,bio,programme_id,level) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET bio=$2,programme_id=$3,level=$4,updated_at=now()', [actor.id, value.bio, value.programme_id, value.level])
        return { saved: true }
      }
      case 'user.save': {
        requirePermission(actor, 'users.manage')
        const value = z.object({ id: z.string().min(1).max(128), name: text, role: z.enum(roles), status: z.enum(['active','disabled']), programme_id: uuid.nullable(), department_id: uuid.nullable(), level: z.number().int().nullable() }).strict().parse(data)
        const target = await one<RecordData>(db, 'SELECT id,role FROM "user" WHERE id=$1 FOR UPDATE', [value.id])
        if (actor.role !== 'super_admin' && (['admin','super_admin'].includes(String(target.role)) || ['admin','super_admin'].includes(value.role))) throw new AppError(403, 'Only a super administrator can manage administrator accounts.')
        if (value.id === actor.id && (value.role !== actor.role || value.status !== 'active')) throw new AppError(409, 'You cannot remove your own access.')
        await db.query('UPDATE "user" SET name=$2,role=$3,"updatedAt"=now() WHERE id=$1', [value.id, value.name, value.role])
        await db.query('INSERT INTO profiles(user_id,status,programme_id,department_id,level) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET status=$2,programme_id=$3,department_id=$4,level=$5,updated_at=now()', [value.id, value.status, value.programme_id, value.department_id, value.level])
        if (value.role !== target.role || value.status === 'disabled') await db.query('DELETE FROM session WHERE "userId"=$1', [value.id])
        await audit(db, actor.id, 'user.update', 'user', value.id, { previousRole: target.role, role: value.role, status: value.status })
        return { saved: true }
      }
      case 'user.delete': {
        requirePermission(actor, 'users.manage')
        const { id } = z.object({ id: z.string().min(1).max(128) }).strict().parse(data)
        if (id === actor.id) throw new AppError(409, 'You cannot delete your own account while signed in.')
        const target = await one<RecordData>(db, 'SELECT id,role FROM "user" WHERE id=$1', [id])
        if (actor.role !== 'super_admin' && ['admin', 'super_admin'].includes(String(target.role))) {
          throw new AppError(403, 'Only a super administrator can delete administrator accounts.')
        }
        await db.query('DELETE FROM session WHERE "userId"=$1', [id])
        await db.query('DELETE FROM "user" WHERE id=$1', [id])
        await audit(db, actor.id, 'user.delete', 'user', id, { role: target.role })
        return { deleted: true }
      }
      case 'permissions.save': {
        requirePermission(actor, 'system.manage')
        const value = z.object({ role: z.enum(['student','lecturer','admin']), permissions: z.array(z.string()).max(30) }).strict().parse(data)
        if (value.permissions.includes('system.manage')) throw new AppError(400, 'System management remains exclusive to super administrators.')
        await db.query('DELETE FROM role_permissions WHERE role=$1', [value.role])
        for (const permission of new Set(value.permissions)) await db.query('INSERT INTO role_permissions(role,permission_key) VALUES($1,$2)', [value.role, permission])
        await audit(db, actor.id, 'permissions.update', 'role', value.role, { permissions: value.permissions })
        return { saved: true }
      }
      case 'settings.save': {
        requirePermission(actor, 'system.manage')
        const value = z.object({ key: z.enum(['ai','platform','integrations']), value: z.record(z.string(), z.unknown()) }).strict().parse(data)
        let settings: unknown
        if (value.key === 'ai') settings = z.object({ enabled: z.boolean(), provider: z.enum(['openrouter','gemini']), model: z.string().max(120), student_access: z.boolean(), lecturer_access: z.boolean(), allow_private_materials: z.boolean(), daily_limit: z.number().int().min(1).max(500), max_tokens: z.number().int().min(100).max(8000), temperature: z.number().min(0).max(2) }).strict().parse(value.value)
        else if (value.key === 'platform') settings = z.object({ name: text, official_affiliation: z.boolean(), support_email: z.union([z.email(), z.literal('')]), maintenance: z.boolean() }).strict().parse(value.value)
        else settings = z.object({ email_enabled: z.boolean(), scanning_enabled: z.boolean() }).strict().parse(value.value)
        await db.query('INSERT INTO system_settings(key,value,updated_by) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=$2,updated_by=$3,updated_at=now()', [value.key, JSON.stringify(settings), actor.id])
        await audit(db, actor.id, 'settings.update', 'settings', value.key)
        return { saved: true }
      }
      case 'flag.save': {
        requirePermission(actor, 'system.manage')
        const value = z.object({ key: text, enabled: z.boolean() }).strict().parse(data)
        await db.query('UPDATE feature_flags SET enabled=$2,updated_at=now() WHERE key=$1', [value.key, value.enabled])
        await audit(db, actor.id, 'flag.update', 'feature_flag', value.key, { enabled: value.enabled })
        return { saved: true }
      }
      default: throw new AppError(400, 'Unsupported action.')
    }
  })
}
