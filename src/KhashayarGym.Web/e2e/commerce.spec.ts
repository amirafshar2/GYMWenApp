import { test, expect, type Page } from '@playwright/test'

// فاز ۳ با درگاه آزمایشی و کارمند نمایشی (Demo:StaffPhone در حالت Development)
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const phone = () => '0917' + String(Math.floor(1_000_000 + Math.random() * 8_999_999))
async function login(page: Page, mobile: string) {
  await page.getByLabel('شمارهٔ موبایل').first().fill(mobile)
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
}
async function paySandbox(page: Page) {
  await page.waitForURL(/payment-sandbox/)
  await page.getByRole('button', { name: /pay/i }).click()
}

test.describe.configure({ mode: 'serial' })

test('خرید از شاپ: انتخاب رنگ و سایز ← سبد ← پرداخت ← سفارش آمادهٔ تحویل', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/shop?kind=merch')
  await page.getByRole('link', { name: /تیشرت دری‌فیت/ }).click()
  await page.getByRole('button', { name: 'آبی خشایار' }).click()
  await page.getByRole('button', { name: 'L', exact: true }).click()
  await page.locator('li:has(span.text-\\[\\#1f7a46\\]) button').first().click() // شعبه‌ای با موجودی
  await page.getByRole('button', { name: 'افزودن به سبد' }).click()
  await page.goto('/cart')
  await page.getByRole('button', { name: 'ورود و پرداخت' }).click()
  await login(page, phone())
  await page.waitForURL(/\/cart/)
  await page.getByRole('button', { name: /^ثبت و پرداخت/ }).click()
  await paySandbox(page)
  await page.waitForURL(/\/shop\/orders\//, { timeout: 20_000 })
  await expect(page.getByText('آمادهٔ تحویل در باشگاه')).toBeVisible()
  await expect(page.getByLabel(/سبد خرید/)).toHaveCount(0) // سبد خالی شد
})

test('بوفه: سفارش از QR میز، نمایش لحظه‌ای روی تابلو و «آماده است» روی گوشی مشتری', async ({ browser }) => {
  test.setTimeout(120_000)
  const staff = await (await browser.newContext()).newPage()
  await staff.goto('/login?next=%2Fpanel%2Fcanteen%3Fbranch%3Dghoddousi-gharbi')
  await login(staff, '09100000000')
  await expect(staff.getByText('● لحظه‌ای')).toBeVisible({ timeout: 15_000 })

  const member = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await member.goto('/login?next=' + encodeURIComponent('/canteen/ghoddousi-gharbi?table=میز 7'))
  await login(member, phone())
  await member.waitForURL(/\/canteen\/ghoddousi/)
  await member.getByRole('button', { name: 'افزودن' }).first().click()
  await member.getByRole('button', { name: /مشاهده و پرداخت/ }).click()
  await member.getByRole('button', { name: /درگاه بانکی/ }).click()
  await member.getByRole('button', { name: /^ثبت سفارش و پرداخت/ }).click()
  await paySandbox(member)
  await member.waitForURL(/\/canteen\/orders\//, { timeout: 20_000 })
  await expect(member.getByText('● اتصال لحظه‌ای برقرار است')).toBeVisible({ timeout: 15_000 })

  const card = staff.locator('li', { hasText: 'میز 7' }).first()
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.getByRole('button', { name: 'شروع آماده‌سازی' }).click()
  await staff.locator('li', { hasText: 'میز 7' }).first().getByRole('button', { name: 'آماده شد' }).click()
  await expect(member.getByText('سفارشت آماده است! از بوفه تحویل بگیر')).toBeVisible({ timeout: 10_000 })
})

test('کیف پول: شارژ و نمایش در گردش حساب', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/login?next=%2Fwallet')
  await login(page, phone())
  await page.waitForURL(/\/wallet/)
  await page.getByRole('button', { name: /۳۰۰٬۰۰۰ تومان/ }).click()
  await page.getByRole('button', { name: /^پرداخت/ }).click()
  await paySandbox(page)
  await page.waitForURL(/\/wallet\?payment=/, { timeout: 20_000 })
  await expect(page.getByText(/به کیف پول اضافه شد/)).toBeVisible()
  await expect(page.getByText('شارژ کیف پول').last()).toBeVisible()
})
