import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { demoPassword, demoUsers, login, visitWorkspacePage } from './helpers'

test.beforeAll(() => {
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error('Set DEMO_ACCOUNT_PASSWORD (min 12 chars) before running accessibility audits.')
  }
})

type AuditTarget = { label: string; email: string; path: string; heading: RegExp | string }

const dashboardAudits: AuditTarget[] = [
  { label: 'Student dashboard', email: demoUsers.student, path: '/dashboard', heading: /Welcome/i },
  { label: 'Student Test Yourself', email: demoUsers.student, path: '/test-yourself', heading: 'Test Yourself' },
  { label: 'Lecturer dashboard', email: demoUsers.lecturer, path: '/lecturer/dashboard', heading: 'Dashboard' },
  { label: 'Admin dashboard', email: demoUsers.admin, path: '/admin/dashboard', heading: 'Admin dashboard' },
  { label: 'Super admin dashboard', email: demoUsers.superAdmin, path: '/super-admin/dashboard', heading: 'Admin dashboard' },
]

test.describe('Accessibility audits (axe — WAVE-aligned rules)', () => {
  for (const target of dashboardAudits) {
    test(`${target.label} — no serious or critical violations`, async ({ page }) => {
      await login(page, target.email)
      await visitWorkspacePage(page, target.path)
      await expect(page.getByRole('heading', { name: target.heading })).toBeVisible({ timeout: 30_000 })

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      const blocking = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
      if (blocking.length > 0) {
        const summary = blocking.map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`).join('\n')
        expect(blocking, `Axe violations on ${target.path}:\n${summary}`).toEqual([])
      }

      const moderate = results.violations.filter(v => v.impact === 'moderate')
      test.info().annotations.push({
        type: 'axe-moderate',
        description: `${target.label}: ${moderate.length} moderate, ${results.violations.length - blocking.length - moderate.length} minor`,
      })
    })
  }

  test('Public login page — no serious or critical violations', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const blocking = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
    expect(blocking).toEqual([])
  })
})
