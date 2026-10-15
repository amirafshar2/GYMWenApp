/**
 * صحنهٔ هیرو روی canvas: هالتری با صفحه‌های آبی برند که با اسکرول از زمین بلند می‌شود
 * (کلین → پرس بالای سر) و گرد منیزیم پخش می‌شود.
 * اگر توالی فریم ویدیو در /media/hero/frames موجود باشد، به‌جای این صحنه همان پخش می‌شود (FrameSequence).
 */

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export class BarbellScene {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private particles: Particle[] = []
  private lastP = 0
  private colors = { plate: '#2c6bae', plateHi: '#4c8fd9', iron: '#07090c', steel: '#12161c', chalk: '#eef1f4' }

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.colors = {
      plate: css('--color-plate') || this.colors.plate,
      plateHi: css('--color-plate-hi') || this.colors.plateHi,
      iron: css('--color-iron') || this.colors.iron,
      steel: css('--color-steel') || this.colors.steel,
      chalk: css('--color-chalk') || this.colors.chalk,
    }
    this.resize()
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.w = r.width
    this.h = r.height
    this.canvas.width = Math.round(r.width * this.dpr)
    this.canvas.height = Math.round(r.height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  /** موقعیت عمودی هالتری بر اساس پیشرفت اسکرول (۰ تا ۱) */
  private barY(p: number) {
    const floor = this.h * 0.86
    const rack = this.h * 0.56
    const top = this.h * 0.24
    if (p < 0.42) return lerp(floor, rack, easeInOut(p / 0.42))
    if (p < 0.55) return rack + Math.sin(((p - 0.42) / 0.13) * Math.PI) * this.h * 0.015 // dip
    if (p < 0.85) return lerp(rack, top, easeInOut((p - 0.55) / 0.3))
    return top
  }

  render(p: number) {
    const { ctx, w, h, colors } = this
    const v = p - this.lastP
    this.lastP = p

    // پس‌زمینه + نور سقفی سالن
    ctx.fillStyle = colors.iron
    ctx.fillRect(0, 0, w, h)
    const spot = ctx.createRadialGradient(w / 2, -h * 0.1, 0, w / 2, -h * 0.1, h * 1.1)
    spot.addColorStop(0, 'rgba(76,143,217,0.20)')
    spot.addColorStop(0.45, 'rgba(44,107,174,0.06)')
    spot.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = spot
    ctx.fillRect(0, 0, w, h)

    this.drawFloor()

    const y = this.barY(p)
    const len = Math.min(w * 0.94, 1500)
    const plateH = clamp(Math.min(w * 0.42, h * 0.42), 110, 400)
    const bend = clamp(-v * 900, -1, 1) * plateH * 0.12 + (p > 0.85 ? 0 : Math.sin(p * 40) * 0.6)

    // سایه روی زمین
    const lift = clamp((this.h * 0.86 - y) / (this.h * 0.66), 0, 1)
    const shadow = ctx.createRadialGradient(w / 2, h * 0.9, 0, w / 2, h * 0.9, len * 0.5)
    shadow.addColorStop(0, `rgba(0,0,0,${0.55 * (1 - lift)})`)
    shadow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shadow
    ctx.fillRect(0, h * 0.82, w, h * 0.18)

    this.drawBarbell(w / 2, y, len, plateH, bend)

    // گرد منیزیم: شروع حرکت و لحظهٔ قفل بالای سر
    if (Math.abs(v) > 0.0015 || (p > 0.84 && p < 0.9)) {
      const n = Math.min(8, Math.ceil(Math.abs(v) * 400) + (p > 0.84 && p < 0.9 ? 3 : 0))
      for (let i = 0; i < n; i++) this.emit(w / 2 + (Math.random() < 0.5 ? -1 : 1) * (len / 2 - plateH * 0.2), y, plateH)
    }
    this.drawParticles()
  }

  private drawFloor() {
    const { ctx, w, h } = this
    const horizon = h * 0.84
    const vpX = w / 2
    const vpY = h * 0.35
    ctx.save()
    ctx.strokeStyle = 'rgba(238,241,244,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    ctx.lineTo(w, horizon)
    for (let i = -10; i <= 10; i++) {
      const x = vpX + i * (w / 7)
      const t = (horizon - vpY) / (h - vpY)
      ctx.moveTo(lerp(vpX, x, t), horizon)
      ctx.lineTo(x, h)
    }
    for (let k = 1; k < 5; k++) {
      const yy = horizon + (h - horizon) * (k / 5) ** 1.6
      ctx.moveTo(0, yy)
      ctx.lineTo(w, yy)
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawBarbell(cx: number, cy: number, len: number, plateH: number, bend: number) {
    const { ctx } = this
    const half = len / 2
    const barT = clamp(plateH * 0.045, 5, 11)

    // میله: منحنی با کمی خم (whip)
    const bar = ctx.createLinearGradient(0, cy - barT, 0, cy + barT)
    bar.addColorStop(0, '#d9dee5')
    bar.addColorStop(0.5, '#7d8794')
    bar.addColorStop(1, '#3b424c')
    ctx.strokeStyle = bar
    ctx.lineWidth = barT
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - half, cy + bend)
    ctx.quadraticCurveTo(cx, cy - bend, cx + half, cy + bend)
    ctx.stroke()

    // دست‌گیره‌های آج‌دار (knurling)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1
    for (const s of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const x = cx + s * (half * 0.18 + i * 5)
        ctx.beginPath(); ctx.moveTo(x, cy - barT / 2); ctx.lineTo(x + 3, cy + barT / 2); ctx.stroke()
      }
    }

    for (const s of [-1, 1]) {
      const tilt = Math.atan2(bend * 2, half) * s
      const plates = [
        { h: plateH, t: plateH * 0.12, c: this.colors.plate },
        { h: plateH, t: plateH * 0.12, c: this.colors.plate },
        { h: plateH * 0.62, t: plateH * 0.08, c: '#2a3039' },
        { h: plateH * 0.2, t: plateH * 0.07, c: '#9aa3ae' }, // collar
      ]
      let offset = half * 0.62
      ctx.save()
      ctx.translate(cx + s * offset, cy + bend * 0.7)
      ctx.rotate(tilt)
      let x = 0
      for (const pl of plates) {
        const px = s > 0 ? x : -x - pl.t
        this.drawPlate(px, -pl.h / 2, pl.t, pl.h, pl.c)
        x += pl.t + 2
      }
      ctx.restore()
      offset += x
    }
  }

  private drawPlate(x: number, y: number, t: number, h: number, color: string) {
    const { ctx } = this
    const r = Math.min(t * 0.35, 8)
    const g = ctx.createLinearGradient(x, 0, x + t, 0)
    g.addColorStop(0, shade(color, -0.35))
    g.addColorStop(0.35, color)
    g.addColorStop(0.6, shade(color, 0.18))
    g.addColorStop(1, shade(color, -0.45))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x, y, t, h, r)
    ctx.fill()
    if (color === this.colors.plate) {
      // لبهٔ لاستیکی و glow آبی
      ctx.save()
      ctx.shadowColor = 'rgba(76,143,217,0.55)'
      ctx.shadowBlur = 24
      ctx.strokeStyle = 'rgba(160,200,245,0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
  }

  private emit(x: number, y: number, plateH: number) {
    if (this.particles.length > 260) return
    this.particles.push({
      x: x + (Math.random() - 0.5) * plateH * 0.3,
      y: y + (Math.random() - 0.5) * plateH * 0.6,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -Math.random() * 0.6 - 0.1,
      life: 0,
      max: 90 + Math.random() * 90,
      r: 0.6 + Math.random() * 2.4,
    })
  }

  private drawParticles() {
    const { ctx } = this
    ctx.save()
    ctx.fillStyle = this.colors.chalk
    this.particles = this.particles.filter((pt) => {
      pt.life++
      pt.x += pt.vx
      pt.y += pt.vy
      pt.vx *= 0.99
      pt.vy *= 0.99
      const a = 1 - pt.life / pt.max
      if (a <= 0) return false
      ctx.globalAlpha = a * 0.55
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pt.r * (1 + pt.life / pt.max), 0, Math.PI * 2)
      ctx.fill()
      return true
    })
    ctx.restore()
  }

  get busy() { return this.particles.length > 0 }
}

/** پخش توالی فریم (خروجی scripts/make-hero-frames) روی canvas */
export class FrameSequence {
  private ctx: CanvasRenderingContext2D
  private frames: HTMLImageElement[] = []
  private w = 0
  private h = 0

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, urls: string[]) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.resize()
    // فریم اول فوری، بقیه با اولویت پایین
    this.frames = urls.map((u, i) => {
      const img = new Image()
      img.decoding = 'async'
      if (i === 0) img.fetchPriority = 'high'
      img.src = u
      return img
    })
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.w = r.width; this.h = r.height
    this.canvas.width = Math.round(r.width * dpr)
    this.canvas.height = Math.round(r.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(p: number) {
    let i = Math.round(p * (this.frames.length - 1))
    while (i > 0 && !this.frames[i].complete) i-- // اگر فریم هنوز نرسیده، نزدیک‌ترین قبلی
    const img = this.frames[i]
    if (!img?.complete || !img.naturalWidth) return
    const s = Math.max(this.w / img.naturalWidth, this.h / img.naturalHeight)
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s
    this.ctx.drawImage(img, (this.w - dw) / 2, (this.h - dh) / 2, dw, dh)
    const g = this.ctx.createLinearGradient(0, 0, 0, this.h)
    g.addColorStop(0, 'rgba(7,9,12,0.35)')
    g.addColorStop(1, 'rgba(7,9,12,0.85)')
    this.ctx.fillStyle = g
    this.ctx.fillRect(0, 0, this.w, this.h)
  }

  get busy() { return false }
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = (c: number) => clamp(Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt), 0, 255)
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255)
  return `rgb(${r},${g},${b})`
}
