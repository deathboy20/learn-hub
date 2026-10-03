import { test, expect } from '@playwright/test'

test('public landing shows LearnHub', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').getByRole('link', { name: 'LearnHub home' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Learn with clarity/i })).toBeVisible()
})

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
})
