import { expect, type Page } from '@playwright/test'

export const demoPassword = process.env.DEMO_ACCOUNT_PASSWORD ?? 'LearnHubDemo2026!'

export const demoUsers = {
  student: 'student@learnhub.demo',
  lecturer: 'lecturer@learnhub.demo',
  admin: 'admin@learnhub.demo',
  superAdmin: 'superadmin@learnhub.demo',
} as const

export async function login(page: Page, email: string, password = demoPassword) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.locator('#auth-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).not.toBeVisible({ timeout: 500 }).catch(() => {})
  await expect(page.getByText('Invalid email or password')).not.toBeVisible()
  await page.waitForURL(/\/(dashboard|lecturer\/dashboard|admin\/dashboard|super-admin\/dashboard)/, {
    timeout: 30_000,
  })
}

export async function visitWorkspacePage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(path)}(\\?|$)`), { timeout: 30_000 })
  await expect(page.locator('#main-content')).toBeVisible()
}

export async function setTheme(page: Page, mode: 'light' | 'dark') {
  const html = page.locator('html')
  const isDark = await html.evaluate(el => el.classList.contains('dark'))
  if ((mode === 'dark') !== isDark) {
    await page.getByRole('button', { name: /Switch to (light|dark) theme/i }).click()
  }
  if (mode === 'dark') await expect(html).toHaveClass(/dark/)
  else await expect(html).not.toHaveClass(/dark/)
}

export async function expectThemedSurface(page: Page) {
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toMatch(/rgb\(\d+, \d+, \d+\)/)
}

export type NavCheck = { href: string; heading: RegExp | string }

export const studentNav: NavCheck[] = [
  { href: '/dashboard', heading: /Welcome/i },
  { href: '/my-courses', heading: 'My courses' },
  { href: '/resources', heading: /Resource library/i },
  { href: '/past-questions', heading: 'Past Questions' },
  { href: '/quizzes', heading: 'Quizzes' },
  { href: '/progress', heading: 'Progress' },
  { href: '/bookmarks', heading: 'Bookmarks' },
  { href: '/announcements', heading: 'Announcements' },
  { href: '/calendar', heading: 'Academic calendar' },
  { href: '/test-yourself', heading: 'Test Yourself' },
]

export const lecturerNav: NavCheck[] = [
  { href: '/lecturer/dashboard', heading: 'Dashboard' },
  { href: '/lecturer/courses', heading: 'My courses' },
  { href: '/lecturer/resources', heading: 'Resources' },
  { href: '/lecturer/resources/upload', heading: 'Upload resource' },
  { href: '/lecturer/quizzes', heading: 'Quizzes' },
  { href: '/lecturer/announcements', heading: 'Announcements' },
  { href: '/lecturer/analytics', heading: 'Analytics' },
]

export const adminNav: NavCheck[] = [
  { href: '/admin/dashboard', heading: 'Admin dashboard' },
  { href: '/admin/users', heading: 'Users' },
  { href: '/admin/faculties', heading: 'Faculties & schools' },
  { href: '/admin/departments', heading: 'Departments' },
  { href: '/admin/programmes', heading: 'Programmes' },
  { href: '/admin/courses', heading: 'Courses' },
  { href: '/admin/course-offerings', heading: 'Course offerings' },
  { href: '/admin/resources', heading: 'Resource moderation' },
  { href: '/admin/quizzes', heading: 'Quizzes' },
  { href: '/admin/announcements', heading: 'Announcements' },
  { href: '/admin/reports', heading: 'Reports' },
  { href: '/admin/audit', heading: 'Audit log' },
]

export const superAdminNav: NavCheck[] = [
  { href: '/super-admin/users', heading: 'Users' },
  { href: '/super-admin/roles', heading: 'Roles & permissions' },
  { href: '/super-admin/audit', heading: 'Audit log' },
  { href: '/super-admin/ai', heading: 'AI configuration' },
]

export async function walkSidebar(page: Page, items: NavCheck[]) {
  const nav = page.getByRole('navigation', { name: 'Workspace' })
  for (const item of items) {
    await nav.locator(`a[href="${item.href}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(item.href)}(\\?|$)`), { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: item.heading })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Forbidden')).not.toBeVisible()
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
