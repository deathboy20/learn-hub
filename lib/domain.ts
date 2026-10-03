export const roles = ['student', 'lecturer', 'admin', 'super_admin'] as const
export type Role = typeof roles[number]
export const permissionKeys = ['users.read', 'users.manage', 'courses.read', 'courses.manage', 'resources.read', 'resources.write', 'resources.moderate', 'quizzes.write', 'announcements.manage', 'analytics.read', 'reports.read', 'audit.read', 'system.manage', 'ai.use'] as const
export type Permission = typeof permissionKeys[number]
export type Actor = {
  id: string
  name: string
  email: string
  role: Role
  status: string
  permissions: string[]
  programme_id: string | null
  department_id: string | null
  level: number | null
  image?: string | null
  bio?: string | null
}
export type RecordData = Record<string, unknown>
export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'AppError' }
}
export function allowed(actor: Actor, permission: string) {
  return actor.status === 'active' && (actor.role === 'super_admin' || actor.permissions.includes(permission))
}
export function requirePermission(actor: Actor, permission: string) {
  if (!allowed(actor, permission)) throw new AppError(403, 'You do not have permission to perform this action.')
}
export function homeFor(role: string) {
  if (role === 'lecturer' || role === 'contributor') return '/lecturer/dashboard'
  if (role === 'super_admin') return '/super-admin/dashboard'
  if (role === 'admin') return '/admin/dashboard'
  return '/dashboard'
}
export const moderationStates = ['draft', 'pending', 'approved', 'rejected', 'correction_required', 'archived'] as const
export type ModerationState = typeof moderationStates[number]
export function transitionResource(from: string, to: string, moderator: boolean) {
  const transitions: Record<string, string[]> = moderator
    ? { draft: ['pending', 'archived'], pending: ['approved', 'rejected', 'correction_required', 'archived'], approved: ['archived', 'correction_required'], rejected: ['pending', 'archived'], correction_required: ['pending', 'archived'], archived: ['pending'] }
    : { draft: ['pending', 'archived'], rejected: ['pending', 'archived'], correction_required: ['pending', 'archived'], approved: ['archived'], pending: ['draft', 'archived'] }
  if (!transitions[from]?.includes(to)) throw new AppError(409, 'This moderation transition is not available. Refresh and try again.')
  return to
}
export type ScoringQuestion = { id: string; points: number; answer: string }
export function scoreQuiz(questions: ScoringQuestion[], answers: Record<string, string>) {
  const total = questions.reduce((sum, question) => sum + question.points, 0)
  const earned = questions.reduce((sum, question) => sum + (answers[question.id]?.trim().toLocaleLowerCase() === question.answer.trim().toLocaleLowerCase() ? question.points : 0), 0)
  return { earned, total, percentage: total ? Math.round(earned / total * 100) : 0 }
}
export function progressPercent(completed: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, Math.round(completed / total * 100))) : 0
}
export const uploadTypes: Record<string, string[]> = {
  'application/pdf': ['pdf'], 'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-powerpoint': ['ppt'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.ms-excel': ['xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'video/mp4': ['mp4'], 'video/webm': ['webm'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'text/plain': ['txt'],
}
export function validateUpload(name: string, type: string, size: number) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (!uploadTypes[type]?.includes(extension)) throw new AppError(400, 'The file extension and content type must match an allowed document, image, or video format.')
  const limit = type.startsWith('video/') ? 500 * 1024 * 1024 : 50 * 1024 * 1024
  if (!Number.isFinite(size) || size <= 0 || size > limit) throw new AppError(413, `File must be between 1 byte and ${limit / 1024 / 1024} MB.`)
  return extension.toUpperCase()
}
