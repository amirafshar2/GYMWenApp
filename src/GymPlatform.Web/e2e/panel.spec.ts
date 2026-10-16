import { expect, test, type Page } from '@playwright/test'

/** پنل کارکنان (فاز ۴) با کارمند نمایشی 09100000000 (مدیر کل + همهٔ نقش‌ها) و مدیر شعبهٔ نمایشی 09100000001 */
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
async function login(page: Page, mobile: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel('شمارهٔ موبایل').first().fill(mobile)
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click()
  // اگر تست دیگری همین شماره را تازه استفاده کرده، سرور ۶۰ ثانیه صبر می‌خواهد
  const code = page.locator('b[dir=ltr]').first()
  await code.or(page.getByText(/ثانیه صبر کنید/)).first().waitFor()
  if (!(await code.isVisible())) { await page.waitForTimeout(61_000); await page.getByRole('button', { name: 'دریافت کد ورود' }).click() }
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
  await page.waitForURL((u) => u.pathname.startsWith(next.split('?')[0]))
}

test.describe.configure({ mode: 'serial' })

let page: Page
test.beforeAll(async ({ browser }, info) => {
  // هر شماره هر ۶۰ ثانیه فقط یک کد می‌گیرد؛ پنل فقط روی پروژهٔ دسکتاپ اجرا می‌شود
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' })).newPage()
  await login(page, '09100000000', '/panel')
})

test('داشبورد مدیر: اعداد، نمودار و خروجی اکسل', async () => {
  await page.goto('/panel/dashboard')
  await expect(page.getByRole('heading', { name: 'داشبورد مدیریت' })).toBeVisible()
  await expect(page.getByText('اعضای فعال')).toBeVisible()
  await expect(page.getByRole('img', { name: /درآمد روزانهٔ/ })).toBeVisible()
  await expect(page.getByText('عضویت‌هایی که تا ۷ روز دیگر تمام می‌شوند')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'خروجی اکسل' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
})

test('پذیرش: جست‌وجوی عضو و ثبت ورود دستی', async () => {
  await page.goto('/panel/reception')
  await page.getByPlaceholder('نام یا ۴ رقم از موبایل…').fill('09391000')
  // عضوی با پکیج زمانی (نه جلسه‌ای که شاید جلساتش تمام شده باشد)
  await page.locator('button', { hasText: /روز$/ }).filter({ hasNotText: /جلسه/ }).first().click()
  await expect(page.getByLabel('پروندهٔ عضو')).toBeVisible()
  // عضو ساختگی ممکن است در شعبهٔ دیگری عضو باشد؛ شعبهٔ پذیرش را با شعبهٔ عضو یکی می‌کنیم
  const branchName = (await page.getByLabel('پروندهٔ عضو').locator('p', { hasText: ' – ' }).first().innerText()).split(' – ')[0]
  await page.getByLabel('شعبه').selectOption({ label: branchName })
  await page.getByRole('button', { name: 'ثبت ورود دستی برای این عضو' }).click()
  await expect(page.getByText('ورود مجاز')).toBeVisible()
})

test('مربی: نوشتن برنامه برای شاگرد', async () => {
  await page.goto('/panel/coach')
  await page.locator('tbody tr').first().click()
  await page.getByLabel('تمرکز روز').first().fill('سینه و سرشانه')
  await page.getByRole('button', { name: 'ذخیره و ارسال برای شاگرد' }).click()
  await expect(page.getByText('برنامه ذخیره شد')).toBeVisible()
})

test('حالت پرزنت: جابه‌جایی بین نمای مشتری و مدیر', async () => {
  await page.goto('/panel/dashboard')
  await page.getByRole('button', { name: /حالت پرزنت/ }).click()
  const bar = page.getByRole('navigation', { name: 'حالت پرزنت' })
  await bar.getByRole('link', { name: 'مشتری' }).click()
  await page.waitForURL(/\/profile/)
  await bar.getByRole('link', { name: 'پذیرش' }).click()
  await expect(page.getByRole('heading', { name: 'پذیرش و ثبت ورود' })).toBeVisible()
  await bar.getByRole('button', { name: 'بستن حالت پرزنت' }).click()
  await expect(bar).toHaveCount(0)
})

test('مدیر شعبه فقط شعبهٔ خودش را می‌بیند و به قیمت‌ها دسترسی ندارد', async ({ browser }) => {
  test.setTimeout(120_000)
  const m = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' })).newPage()
  await login(m, '09100000001', '/panel/dashboard')
  await expect(m.getByRole('heading', { name: 'داشبورد مدیریت' })).toBeVisible()
  await expect(m.getByText('فقط شعبه‌های شما')).toBeVisible()
  await expect(m.getByLabel('شعبه').locator('option')).toHaveCount(1)
  await expect(m.getByRole('link', { name: 'پکیج‌ها و قیمت' })).toHaveCount(0)
  await m.goto('/panel/packages')
  await expect(m.getByText('به این بخش دسترسی ندارید.')).toBeVisible()
})
