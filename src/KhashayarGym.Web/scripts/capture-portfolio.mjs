/**
 * اسکرین‌شات‌های پرتفولیو (برند ساختگی ?brand=demo) برای portfolio-export/<id>/images
 * استفاده: node scripts/capture-portfolio.mjs [baseUrl]
 * خروجی PNG موقت است؛ export-portfolio آن‌ها را به WebP (کیفیت ۸۵، حداکثر ۴۰۰KB) تبدیل می‌کند.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../portfolio-export')
const base = process.argv[2] ?? 'http://localhost:5180'
const exe = process.env.PW_CHROMIUM

// هر آیتم: کدام بخش، و قبل از عکس چه کاری انجام شود
const ITEMS = [
  { id: 'khashayar-hero-scrub', path: '/', prep: async (p) => { await p.mouse.wheel(0, 0) }, scrollFraction: 0.62 },
  { id: 'khashayar-nearest-branch-map', path: '/branches', prep: async (p) => {
      await p.getByRole('button', { name: 'نزدیک‌ترین شعبه به من' }).click(); await p.waitForTimeout(2500)
      await p.evaluate(() => document.getElementById('branches').scrollIntoView()) } },
  { id: 'khashayar-pricing-rack', path: '/packages', prep: async (p) => {
      await p.evaluate(() => document.querySelector('[aria-label*="دوازده"], h3')?.closest('li')?.scrollIntoView({ block: 'center' })) } },
  { id: 'khashayar-festival-countdown', path: '/', clip: 'festival' },
]

const browser = await chromium.launch(exe ? { executablePath: exe } : {})
for (const vp of [{ name: 'desktop', width: 1440, height: 900, mobile: false }, { name: 'mobile', width: 390, height: 844, mobile: true }]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile,
    geolocation: { latitude: 29.632, longitude: 52.502 }, permissions: ['geolocation'], reducedMotion: 'no-preference',
  })
  for (const it of ITEMS) {
    const page = await ctx.newPage()
    await page.goto(`${base}${it.path}?brand=demo`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    if (it.scrollFraction) {
      await page.evaluate((f) => window.scrollTo(0, innerHeight * 3 * f), it.scrollFraction)
      await page.waitForTimeout(1800)
    }
    if (it.prep) { await it.prep(page); await page.waitForTimeout(1500) }
    const dir = join(root, it.id, 'images')
    mkdirSync(dir, { recursive: true })
    if (it.clip === 'festival') {
      await page.locator('[aria-label="جشنوارهٔ تخفیف"]').screenshot({ path: join(dir, `${vp.name}.png`) })
    } else {
      await page.screenshot({ path: join(dir, `${vp.name}.png`) })
    }
    await page.close()
    console.log('✓', it.id, vp.name)
  }
  await ctx.close()
}
await browser.close()
