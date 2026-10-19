import { test, expect, type Browser } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * ویدیوی اسکرولی روی دستگاه‌های مختلف، با CPU کندشده:
 * فاصلهٔ زمان هدف (از موقعیت اسکرول) تا currentTime ویدیو باید کمتر از ۰٫۳ ثانیه بماند.
 * Chromium تست H.264 ندارد؛ فایل‌های mp4 با route به VP9 (همان GOP=4) جایگزین می‌شوند.
 */
const SRC = join(process.cwd(), 'public/media/video')
const TMP = join(tmpdir(), 'kg-vp9')
const vp9 = (name: string) => {
  const out = join(TMP, name.replace('.mp4', '.webm'))
  if (!existsSync(out)) {
    mkdirSync(TMP, { recursive: true })
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(SRC, name), '-an', '-c:v', 'libvpx-vp9', '-g', '4', '-b:v', '0', '-crf', '36',
      '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', out])
  }
  return readFileSync(out)
}

type Profile = { name: string; width: number; height: number; cores: number; memory: number; touch: boolean; cpu: number; expect: string }
const PROFILES: Profile[] = [
  { name: 'کامپیوتر ضعیف', width: 1366, height: 768, cores: 2, memory: 2, touch: false, cpu: 6, expect: 'gym-scrub-540' },
  { name: 'کامپیوتر معمولی', width: 1440, height: 900, cores: 4, memory: 8, touch: false, cpu: 4, expect: 'gym-scrub-720' },
  { name: 'کامپیوتر قوی', width: 1920, height: 1080, cores: 8, memory: 8, touch: false, cpu: 4, expect: 'gym-scrub.mp4' },
  { name: 'تبلت', width: 820, height: 1180, cores: 8, memory: 4, touch: true, cpu: 4, expect: 'gym-scrub-720' },
  { name: 'گوشی', width: 390, height: 844, cores: 8, memory: 4, touch: true, cpu: 6, expect: 'gym-scrub-720' },
]

async function measure(browser: Browser, p: Profile) {
  const ctx = await browser.newContext({ viewport: { width: p.width, height: p.height }, hasTouch: p.touch, isMobile: p.touch, locale: 'fa-IR' })
  await ctx.addInitScript(([cores, memory]) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => memory })
  }, [p.cores, p.memory])
  const requested: string[] = []
  await ctx.route(/\/media\/video\/gym-scrub[^/]*\.mp4/, (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!
    requested.push(name)
    return route.fulfill({ status: 200, contentType: 'video/webm', body: vp9(name) })
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await page.goto('/')
  const section = page.locator('section[aria-label^="ویدیوی تمرین"]')
  await section.scrollIntoViewIfNeeded()
  await expect(section.locator('img').first()).toBeVisible() // عکس فریم اول همیشه هست
  const top = await section.evaluate((el) => el.getBoundingClientRect().top + scrollY)
  await page.evaluate((y) => scrollTo(0, y), top)
  await page.waitForFunction(() => { const v = document.querySelector('video'); return !!v && v.readyState >= 2 && v.duration > 0 }, null, { timeout: 20_000 })
  await page.evaluate(() => {
    const v = document.querySelector('video')! as HTMLVideoElement & { __frames?: number }
    v.__frames = 0
    const f = () => { v.__frames!++; v.requestVideoFrameCallback(f) }
    v.requestVideoFrameCallback(f)
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu })

  const lags: number[] = []
  const height = await section.evaluate((el) => el.getBoundingClientRect().height - innerHeight)
  for (let y = 0; y <= height; y += 80) {
    await page.evaluate((dy) => scrollBy(0, dy), 80)
    await page.waitForTimeout(120)
    const lag = await page.evaluate(() => { const v = document.querySelector('video')!; return Math.abs(Number(v.dataset.target ?? 0) - v.currentTime) })
    lags.push(lag)
  }
  // و برگشت به عقب
  for (let i = 0; i < 12; i++) { await page.evaluate(() => scrollBy(0, -80)); await page.waitForTimeout(120) }
  const back = await page.evaluate(() => { const v = document.querySelector('video')!; return Math.abs(Number(v.dataset.target ?? 0) - v.currentTime) })
  const frames = await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement & { __frames?: number }).__frames ?? 0)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await ctx.close()
  lags.sort((a, b) => a - b)
  return { median: lags[Math.floor(lags.length / 2)], p90: lags[Math.floor(lags.length * 0.9)], back, frames, requested: [...new Set(requested)] }
}

for (const p of PROFILES) {
  test(`ویدیوی اسکرولی روان: ${p.name}`, async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'هر پروفایل context خودش را می‌سازد')
    test.setTimeout(120_000)
    const r = await measure(browser, p)
    console.log(`[scrub] ${p.name} cpu×${p.cpu}: ${r.requested.join(',')} median=${r.median.toFixed(3)}s p90=${r.p90.toFixed(3)}s back=${r.back.toFixed(3)}s frames=${r.frames}`)
    expect(r.requested.some((n) => n.startsWith(p.expect))).toBe(true)
    expect(r.median).toBeLessThan(0.3)
    expect(r.frames).toBeGreaterThan(10)
  })
}
