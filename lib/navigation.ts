import type { Role } from '@/lib/domain'

export type NavItem = { href: string; label: string; description: string }

export type MobileTabId =
  | 'dashboard'
  | 'courses'
  | 'resources'
  | 'quizzes'
  | 'upload'
  | 'users'
  | 'more'

export type MobileTab = {
  id: MobileTabId
  href: string
  label: string
  description: string
  match?: (pathname: string) => boolean
}

export const profileNavItem: NavItem = {
  href: '/profile',
  label: 'Profile & settings',
  description: 'Account details, preferences, and role-specific configuration',
}

export const studentNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', description: 'Overview of courses, progress, and recent materials' },
  { href: '/my-courses', label: 'My courses', description: 'Enrolled offerings and course hubs' },
  { href: '/resources', label: 'Resources', description: 'Approved lecture notes, slides, and media' },
  { href: '/past-questions', label: 'Past questions', description: 'Previous exam papers and revision sets' },
  { href: '/quizzes', label: 'Quizzes', description: 'Practice and graded assessments' },
  { href: '/test-yourself', label: 'Test Yourself', description: 'Text-only AI practice from pasted notes' },
  { href: '/progress', label: 'Progress', description: 'Completion tracking across resources' },
  { href: '/bookmarks', label: 'Bookmarks', description: 'Saved courses and resources' },
  { href: '/announcements', label: 'Announcements', description: 'Updates from lecturers and faculty' },
  { href: '/calendar', label: 'Calendar', description: 'Study events and deadlines' },
  profileNavItem,
]

export const lecturerNav: NavItem[] = [
  { href: '/lecturer/dashboard', label: 'Dashboard', description: 'Teaching overview and tasks' },
  { href: '/lecturer/courses', label: 'My courses', description: 'Courses you teach this term' },
  { href: '/lecturer/resources', label: 'Resources', description: 'Uploaded and pending materials' },
  { href: '/lecturer/resources/upload', label: 'Upload', description: 'Submit new files for moderation' },
  { href: '/lecturer/quizzes', label: 'Quizzes', description: 'Create and publish assessments' },
  { href: '/lecturer/announcements', label: 'Announcements', description: 'Post course announcements' },
  { href: '/lecturer/analytics', label: 'Analytics', description: 'Engagement and attempt statistics' },
  profileNavItem,
]

export const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', description: 'Platform health and activity' },
  { href: '/admin/users', label: 'Users', description: 'Manage accounts and roles' },
  { href: '/admin/faculties', label: 'Faculties', description: 'Faculty catalogue' },
  { href: '/admin/departments', label: 'Departments', description: 'Department catalogue' },
  { href: '/admin/programmes', label: 'Programmes', description: 'Degree programmes' },
  { href: '/admin/courses', label: 'Courses', description: 'Course catalogue' },
  { href: '/admin/course-offerings', label: 'Offerings', description: 'Term offerings and lecturers' },
  { href: '/admin/resources', label: 'Resources', description: 'Moderate uploaded materials' },
  { href: '/admin/quizzes', label: 'Quizzes', description: 'Review assessments' },
  { href: '/admin/announcements', label: 'Announcements', description: 'Institution-wide notices' },
  { href: '/admin/reports', label: 'Reports', description: 'User reports and flags' },
  { href: '/admin/audit', label: 'Audit log', description: 'Administrative action history' },
  profileNavItem,
]

export const superAdminNav: NavItem[] = [
  { href: '/super-admin/dashboard', label: 'Dashboard', description: 'Operations overview' },
  { href: '/super-admin/users', label: 'Users', description: 'All platform users' },
  { href: '/super-admin/roles', label: 'Roles', description: 'Permission templates' },
  { href: '/super-admin/audit', label: 'Audit', description: 'Security and change log' },
  { href: '/super-admin/ai', label: 'AI', description: 'Assistant provider settings' },
  profileNavItem,
]

export function navForRole(role: Role) {
  if (role === 'super_admin') return superAdminNav
  if (role === 'admin') return adminNav
  if (role === 'lecturer') return lecturerNav
  return studentNav
}

const starts = (href: string) => (pathname: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

export function mobileTabsForRole(role: Role): MobileTab[] {
  if (role === 'lecturer') {
    return [
      { id: 'dashboard', href: '/lecturer/dashboard', label: 'Home', description: 'Teaching dashboard', match: starts('/lecturer/dashboard') },
      { id: 'courses', href: '/lecturer/courses', label: 'Courses', description: 'Your courses', match: starts('/lecturer/courses') },
      { id: 'upload', href: '/lecturer/resources/upload', label: 'Upload', description: 'Upload materials', match: starts('/lecturer/resources/upload') },
      { id: 'quizzes', href: '/lecturer/quizzes', label: 'Quizzes', description: 'Assessments', match: starts('/lecturer/quizzes') },
      { id: 'more', href: '/lecturer/analytics', label: 'More', description: 'All lecturer tools', match: p => p.startsWith('/lecturer') && !['/lecturer/dashboard', '/lecturer/courses', '/lecturer/resources/upload', '/lecturer/quizzes'].some(h => p.startsWith(h)) },
    ]
  }
  if (role === 'admin') {
    return [
      { id: 'dashboard', href: '/admin/dashboard', label: 'Home', description: 'Admin dashboard', match: starts('/admin/dashboard') },
      { id: 'users', href: '/admin/users', label: 'Users', description: 'Manage users', match: starts('/admin/users') },
      { id: 'resources', href: '/admin/resources', label: 'Moderate', description: 'Resource moderation', match: starts('/admin/resources') },
      { id: 'courses', href: '/admin/courses', label: 'Catalog', description: 'Course catalogue', match: p => ['/admin/courses', '/admin/course-offerings', '/admin/faculties', '/admin/departments', '/admin/programmes'].some(h => p.startsWith(h)) },
      { id: 'more', href: '/admin/reports', label: 'More', description: 'All admin pages', match: p => p.startsWith('/admin') && !p.startsWith('/admin/dashboard') && !p.startsWith('/admin/users') && !p.startsWith('/admin/resources') && !['/admin/courses', '/admin/course-offerings', '/admin/faculties', '/admin/departments', '/admin/programmes'].some(h => p.startsWith(h)) },
    ]
  }
  if (role === 'super_admin') {
    return [
      { id: 'dashboard', href: '/super-admin/dashboard', label: 'Home', description: 'Operations overview', match: starts('/super-admin/dashboard') },
      { id: 'users', href: '/super-admin/users', label: 'Users', description: 'Platform users', match: starts('/super-admin/users') },
      { id: 'resources', href: '/super-admin/ai', label: 'AI', description: 'AI configuration', match: starts('/super-admin/ai') },
      { id: 'quizzes', href: '/super-admin/audit', label: 'Audit', description: 'Audit log', match: starts('/super-admin/audit') },
      { id: 'more', href: '/super-admin/roles', label: 'More', description: 'Roles and platform tools', match: p => p.startsWith('/super-admin/settings') || p.startsWith('/super-admin/roles') },
    ]
  }
  return [
    { id: 'dashboard', href: '/dashboard', label: 'Home', description: 'Student dashboard', match: starts('/dashboard') },
    { id: 'courses', href: '/my-courses', label: 'Courses', description: 'My courses', match: p => p.startsWith('/my-courses') },
    { id: 'resources', href: '/resources', label: 'Library', description: 'Resources', match: p => p.startsWith('/resources') || p.startsWith('/past-questions') },
    { id: 'quizzes', href: '/quizzes', label: 'Quizzes', description: 'Quizzes and attempts', match: starts('/quizzes') },
    { id: 'more', href: '/progress', label: 'More', description: 'Progress, bookmarks, calendar, and more', match: p => ['/progress', '/bookmarks', '/announcements', '/calendar', '/notifications', '/profile', '/settings', '/test-yourself'].some(h => p.startsWith(h)) },
  ]
}

/** Floating scholar assistant — not in sidebar; hide during focused quiz attempts. */
export function showStudentAiFab(pathname: string): boolean {
  if (pathname.startsWith('/ai-assistant')) return false
  if (/^\/quizzes\/[^/]+\/attempt/.test(pathname)) return false
  return true
}

export function overflowNavForRole(role: Role, primary: MobileTab[]): NavItem[] {
  const all = navForRole(role)
  const primaryHrefs = new Set(primary.filter(t => t.id !== 'more').map(t => t.href))
  return all.filter(item => !primaryHrefs.has(item.href))
}
