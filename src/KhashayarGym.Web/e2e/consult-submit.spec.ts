import { test, expect } from '@playwright/test'

test('فرم مشاوره با CSRF ثبت می‌شود', async ({ page }) => {
  await page.goto('/#consult')
  await page.getByLabel('نام و نام خانوادگی').fill('سارا رضایی')
  await page.getByLabel('شمارهٔ موبایل').fill(`0917${Math.floor(1000000 + Math.random() * 8999999)}`)
  await page.getByRole('button', { name: 'ثبت درخواست مشاوره' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'ثبت شد' })).toBeVisible()
})

test('درخواست بدون توکن CSRF رد می‌شود', async ({ request }) => {
  const res = await request.post('/api/consultations', { data: { fullName: 'سارا رضایی', mobile: '09171234567' } })
  expect(res.status()).toBe(400)
})
