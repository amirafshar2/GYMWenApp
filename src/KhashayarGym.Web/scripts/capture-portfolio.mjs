/**
 * اسکرین‌شات‌های پرتفولیو با برند ساختگی (brand=demo) → portfolio-export/<id>/images/{desktop,mobile}.png
 * تنظیم هر آیتم (صفحه و سلکتور) در scripts/portfolio-capture.json است تا item.json فقط کلیدهای اسکیمای استاندارد را داشته باشد.
 * صفحه‌های نیازمند ورود (بوفه، پروفایل) با حالت دمو (کد ورود روی صفحه) و درگاه آزمایشی ساخته می‌شوند.
 * استفاده: node scripts/capture-portfolio.mjs [baseUrl]   (بعد: scripts/export-portfolio)
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../portfolio-export')
const base = process.argv[2] ?? 'http://localhost:5180'
const cfg = JSON.parse(readFileSync(join(here, 'portfolio-capture.json'), 'utf8'))
const only = process.argv[3]?.split(',')

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] } : {})
const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }
const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
const phone = () => '0917' + String(Math.floor(1_000_000 + Math.random() * 8_999_999))

async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: vp === 'mobile' ? 2 : 1, isMobile: vp === 'mobile', hasTouch: vp === 'mobile', locale: 'fa-IR' })
  // برند ساختگی و بدون نوار جشنواره، از اولین بارگذاری
  await ctx.addInitScript(() => { try { sessionStorage.setItem('brand', 'demo'); sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } })
  return ctx.newPage()
}
async function login(page, mobile) {
  await page.getByLabel('شمارهٔ موبایل').first().fill(mobile)
  await page.getByRole('button', { name: 'دریافت کد ورود' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
}
async function paySandbox(page) { await page.waitForURL(/payment-sandbox/); await page.getByRole('button', { name: /pay/i }).click() }
const out = (id, vp) => { mkdirSync(join(root, id, 'images'), { recursive: true }); return join(root, id, 'images', `${vp}.png`) }

/** عضو با عضویت فعال (برای پروفایل) */
async function memberWithMembership(page) {
  await page.goto(`${base}/join?package=quarter&section=men`)
  await page.locator('input[name=branch]').first().check()
  await page.getByRole('button', { name: /ادامه: انتخاب پکیج/ }).click()
  await page.getByRole('button', { name: /^ادامه/ }).click()
  await login(page, phone())
  await page.getByLabel(/نام و نام خانوادگی/).fill('کاوه رستمی')
  for (const g of await page.locator('[role=radiogroup]').all()) await g.getByText('خیر').click()
  await page.getByText('متن قرارداد را خواندم').click()
  await page.getByRole('button', { name: 'دریافت کد امضا' }).click()
  await page.locator('input[autocomplete=one-time-code]').fill(toLatin(await page.locator('b[dir=ltr]').first().innerText()))
  await page.getByRole('button', { name: /^پرداخت/ }).click()
  await paySandbox(page)
  await page.waitForURL(/join\/result/, { timeout: 20000 })
}

async function capture(id, c) {
  if (c.page === 'board') {
    // مشتری: شارژ کیف پول و دو سفارش؛ کارمند: تابلو
    const m = await newPage('mobile')
    await m.goto(`${base}/login?next=%2Fwallet`); await login(m, phone()); await m.waitForURL(/wallet/)
    await m.getByRole('button', { name: /۲٬۰۰۰٬۰۰۰ تومان/ }).click()
    await m.getByRole('button', { name: /^پرداخت/ }).click(); await paySandbox(m); await m.waitForURL(/wallet\?payment/, { timeout: 20000 })
    for (const [table, n] of [['میز ۳', 4], ['میز ۷', 0]]) {
      await m.goto(`${base}/canteen/ghoddousi-gharbi?table=${encodeURIComponent(table)}`); await m.waitForLoadState('networkidle')
      await m.getByRole('button', { name: 'افزودن' }).nth(n).click(); await m.getByRole('button', { name: 'افزودن' }).nth(1).click()
      if (table === 'میز ۳') { await m.waitForTimeout(600); await m.screenshot({ path: out(id, 'mobile') }) }
      await m.getByRole('button', { name: /مشاهده و پرداخت/ }).click()
      await m.getByRole('button', { name: /^ثبت سفارش و پرداخت/ }).click(); await m.waitForURL(/canteen\/orders/)
    }
    const s = await newPage('desktop')
    await s.goto(`${base}/login?next=%2Fpanel%2Fcanteen%3Fbranch%3Dghoddousi-gharbi`); await login(s, '09100000000')
    await s.getByText('● لحظه‌ای').waitFor({ timeout: 15000 })
    await s.getByRole('button', { name: 'شروع آماده‌سازی' }).first().click(); await s.waitForTimeout(1200)
    await s.screenshot({ path: out(id, 'desktop') })
    await m.context().close(); await s.context().close()
    return
  }
  if (c.page === 'profile') {
    const p = await newPage('desktop')
    await memberWithMembership(p)
    await p.goto(`${base}/profile`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200)
    await p.screenshot({ path: out(id, 'desktop') })
    await p.setViewportSize(VPS.mobile); await p.waitForTimeout(800)
    await p.screenshot({ path: out(id, 'mobile') })
    await p.context().close()
    return
  }
  for (const vp of ['desktop', 'mobile']) {
    const p = await newPage(vp)
    await p.goto(`${base}${c.page}`, { waitUntil: 'networkidle' })
    if (c.page.startsWith('/join')) { await p.locator('input[name=branch]').first().check(); await p.waitForTimeout(800) }
    if (c.selector) {
      const el = p.locator(c.selector).first()
      // هدر و دکمه‌های ثابت روی عکس بخش نیفتند
      await p.addStyleTag({ content: '.kg-chrome,[aria-label="برگشت به بالای صفحه"]{display:none!important}' })
      await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500)
      await el.screenshot({ path: out(id, vp) })
    } else {
      await p.waitForTimeout(2200)
      await p.screenshot({ path: out(id, vp) })
    }
    await p.context().close()
  }
}

for (const [id, c] of Object.entries(cfg)) {
  if (only && !only.includes(id)) continue
  if (!existsSync(join(root, id, 'item.json'))) { console.warn('⚠ item.json ندارد:', id); continue }
  try { await capture(id, c); console.log('✓', id) } catch (e) { console.error('✗', id, e.message.split('\n')[0]) }
}
await browser.close()
