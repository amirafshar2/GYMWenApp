import { test, expect, type Page } from '@playwright/test'

// سناریوی کامل فاز ۲ با درگاه آزمایشی: نیاز به Payment:UseVirtualGateway=true و Otp:ExposeCodeInResponse=true (حالت Development)
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const phone = () => '0917' + String(Math.floor(1_000_000 + Math.random() * 8_999_999))

async function demoCode(page: Page) {
  return toLatin(await page.locator('b[dir=ltr]').innerText())
}

test.describe.configure({ mode: 'serial' })

test('ثبت‌نام کامل: پکیج ← ورود ← قرارداد ← پرداخت ← کارت عضویت', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/join?package=quarter')

  await page.locator('label', { hasText: /^سالن بانوان$/ }).click()
  await page.locator('input[name=branch]').first().check()
  await page.getByRole('button', { name: /ادامه: انتخاب پکیج/ }).click()

  await page.getByPlaceholder('START10').fill('start10')
  await page.getByRole('button', { name: 'اعمال' }).click()
  await expect(page.getByText(/اعمال شد/)).toBeVisible()
  await page.getByRole('button', { name: /^ادامه/ }).click()

  await page.getByLabel('شمارهٔ موبایل').fill(phone())
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))

  await expect(page.getByRole('heading', { name: /قرارداد عضویت/ })).toBeVisible()
  await page.getByLabel(/نام و نام خانوادگی/).fill('مریم احمدی')
  for (const g of await page.locator('[role=radiogroup]').all()) await g.getByText('خیر').click()
  await page.getByText('متن قرارداد را خواندم').click()
  await page.getByRole('button', { name: 'دریافت کد امضا' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))

  await expect(page.getByRole('heading', { name: 'پرداخت آنلاین' })).toBeVisible()
  await page.getByRole('button', { name: /^پرداخت/ }).click()
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /pay/i }).click()

  await page.waitForURL(/\/join\/result/, { timeout: 20_000 })
  await expect(page.getByText('پرداخت موفق بود')).toBeVisible()
  await expect(page.getByRole('img', { name: 'کد QR ورود به باشگاه' })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'دانلود فاکتور PDF' }).click()
  expect((await download).suggestedFilename()).toMatch(/^invoice-KG-/)

  // نشست بعد از رفرش با کوکی HttpOnly برمی‌گردد
  await page.goto('/profile')
  await page.reload()
  await expect(page.getByText('تمدید با یک کلیک')).toBeVisible()
  await expect(page.getByText('موفق')).toBeVisible()
})

test('انصراف در درگاه، عضویت را فعال نمی‌کند', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/login?next=/join%3Fpackage%3Dquarter%26section%3Dmen')
  await page.getByLabel('شمارهٔ موبایل').fill(phone())
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))
  await page.waitForURL(/\/join/)
  await page.locator('input[name=branch]').first().check()
  await page.getByRole('button', { name: /ادامه: انتخاب پکیج/ }).click()
  await page.getByRole('button', { name: /^ادامه/ }).click()
  await page.getByLabel(/نام و نام خانوادگی/).fill('رضا محمدی')
  for (const g of await page.locator('[role=radiogroup]').all()) await g.getByText('خیر').click()
  await page.getByText('متن قرارداد را خواندم').click()
  await page.getByRole('button', { name: 'دریافت کد امضا' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(await demoCode(page))
  await page.getByRole('button', { name: /^پرداخت/ }).click()
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /cancel/i }).click()
  await page.waitForURL(/\/join\/result/, { timeout: 20_000 })
  await expect(page.getByText('پرداخت لغو شد یا ناموفق بود')).toBeVisible()
  await expect(page.getByRole('link', { name: 'تلاش دوباره' })).toBeVisible()
})

test('صفحهٔ پروفایل بدون ورود به /login می‌رود', async ({ page }) => {
  await page.goto('/profile')
  await page.waitForURL(/\/login\?next=%2Fprofile/)
  await expect(page.getByRole('heading', { name: 'ورود به حساب' })).toBeVisible()
})
