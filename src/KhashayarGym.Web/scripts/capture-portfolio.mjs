/**
 * اسکرین‌شات‌های پرتفولیو با برند ساختگی (?brand=demo) برای portfolio-export/<id>/images
 * هر item.json یک فیلد _selector دارد: سلکتور بخشی که عکس گرفته می‌شود (null = بالای صفحه).
 * استفاده: node scripts/capture-portfolio.mjs [baseUrl]   (بعد: scripts/export-portfolio)
 */
import { chromium } from '@playwright/test'
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../portfolio-export')
const base = process.argv[2] ?? 'http://localhost:5180'
const items = readdirSync(root).filter((d) => existsSync(join(root, d, 'item.json')))
  .map((d) => ({ dir: d, ...JSON.parse(readFileSync(join(root, d, 'item.json'), 'utf8')) }))

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] } : {})
for (const vp of [{ name: 'desktop', width: 1440, height: 900, mobile: false }, { name: 'mobile', width: 390, height: 844, mobile: true }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: vp.mobile, hasTouch: vp.mobile })
  for (const it of items) {
    const page = await ctx.newPage()
    await page.goto(`${base}/?brand=demo`, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { sessionStorage.setItem('festival-hidden', '1') } catch { /* */ } })
    await page.reload({ waitUntil: 'networkidle' })
    const sel = it._selector === 'faq' ? 'section:has([data-state])' : it._selector
    mkdirSync(join(root, it.dir, 'images'), { recursive: true })
    const out = join(root, it.dir, 'images', `${vp.name}.png`)
    if (sel) {
      // اسکرین‌شات خود بخش (Playwright خودش تا آن اسکرول می‌کند)
      const el = page.locator(sel).first()
      await el.scrollIntoViewIfNeeded()
      await page.waitForTimeout(2500)
      await el.screenshot({ path: out })
    } else {
      await page.waitForTimeout(2200)
      await page.screenshot({ path: out })
    }
    await page.close()
    console.log('✓', it.id, vp.name)
  }
  await ctx.close()
}
await browser.close()
