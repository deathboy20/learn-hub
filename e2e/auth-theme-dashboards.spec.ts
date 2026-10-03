import { test, expect } from '@playwright/test'
import {
  adminNav,
  demoPassword,
  demoUsers,
  expectThemedSurface,
  lecturerNav,
  login,
  setTheme,
  studentNav,
  superAdminNav,
  walkSidebar,
} from './helpers'

test.beforeAll(() => {
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error('Set DEMO_ACCOUNT_PASSWORD (min 12 chars) before running Playwright E2E tests.')
  }
})

test.describe('Public UI themes', () => {
  test('landing supports light and dark', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'LearnHub home' })).toBeVisible()
    await setTheme(page, 'light')
    await expectThemedSurface(page)
    await setTheme(page, 'dark')
    await expectThemedSurface(page)
  })
})

test.describe('Authentication', () => {
  test('password visibility toggle on login', async ({ page }) => {
    await page.goto('/login')
    const password = page.locator('#auth-password')
    await password.fill('LearnHubDemo2026!')
    await expect(password).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  for (const [role, email] of Object.entries(demoUsers)) {
    test(`demo ${role} can sign in`, async ({ page }) => {
      await login(page, email)
      const expected =
        role === 'student'
          ? /\/dashboard/
          : role === 'lecturer'
            ? /\/lecturer\/dashboard/
            : role === 'superAdmin'
              ? /\/super-admin\/dashboard/
              : /\/admin\/dashboard/
      await expect(page).toHaveURL(expected, { timeout: 30_000 })
    })
  }
})

test.describe('Workspace themes and navigation', () => {
  test('student dashboard and sidebar in light and dark', async ({ page }) => {
    await login(page, demoUsers.student)
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 30_000 })
    await setTheme(page, 'light')
    await walkSidebar(page, studentNav)
    await setTheme(page, 'dark')
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 30_000 })
    await walkSidebar(page, studentNav.slice(0, 4))
  })

  test('lecturer dashboard and sidebar', async ({ page }) => {
    await login(page, demoUsers.lecturer)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 })
    await setTheme(page, 'dark')
    await walkSidebar(page, lecturerNav)
    await setTheme(page, 'light')
  })

  test('admin dashboard and sidebar', async ({ page }) => {
    await login(page, demoUsers.admin)
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible({ timeout: 30_000 })
    await walkSidebar(page, adminNav)
  })

  test('super admin dashboard and sidebar', async ({ page }) => {
    await login(page, demoUsers.superAdmin)
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible({ timeout: 30_000 })
    await walkSidebar(page, superAdminNav)
  })
})
