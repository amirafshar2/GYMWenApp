import { test, expect } from '@playwright/test'

test('هیرو شعار برند را نشان می‌دهد و صفحه RTL است', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ورزش کن')
})

test('نزدیک‌ترین شعبه با موقعیت کاربر پیدا می‌شود', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 29.7236, longitude: 52.4413 }) // کنار شهرک گلستان
  await page.goto('/branches')
  await page.getByRole('button', { name: 'نزدیک‌ترین شعبه به من' }).click()
  await expect(page.getByText('نزدیک‌ترین،').first()).toBeVisible()
  await expect(page.locator('#branch-shahrak-golestan-women')).toContainText('نزدیک‌ترین')
})

test('فیلتر بانوان فقط شعبه‌های دارای سالن بانوان را نشان می‌دهد', async ({ page }) => {
  await page.goto('/branches')
  await page.getByRole('radio', { name: 'بانوان' }).click()
  await expect(page.locator('#branch-farhangshahr-kasaei')).toHaveCount(0)
  await expect(page.locator('#branch-farhangshahr-women')).toBeVisible()
})

test('پکیج‌ها با تخفیف جشنواره نمایش داده می‌شوند', async ({ page }) => {
  await page.goto('/packages')
  await expect(page.getByRole('heading', { name: 'دوازده‌ماهه' })).toBeVisible()
  await expect(page.getByText('٪ جشنواره').first()).toBeVisible()
})

test('فرم مشاوره خطای شمارهٔ نامعتبر را نشان می‌دهد', async ({ page }) => {
  await page.goto('/#consult')
  await page.getByLabel('نام و نام خانوادگی').fill('سارا رضایی')
  await page.getByLabel('شمارهٔ موبایل').fill('12345')
  await page.getByRole('button', { name: 'ثبت درخواست مشاوره' }).click()
  await expect(page.getByText('شمارهٔ موبایل را مثل')).toBeVisible()
})

test('هدرهای امنیتی روی پاسخ‌ها هست', async ({ request }) => {
  const res = await request.get('/api/branches')
  expect(res.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
})
