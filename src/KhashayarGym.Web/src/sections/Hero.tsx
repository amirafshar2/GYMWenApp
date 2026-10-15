import { useEffect, useRef } from 'react'
import { brand } from '../lib/brand'
import { faNum } from '../lib/fa'
import { ScrollTrigger, scrollToId } from '../lib/motion'
import { prefersReducedMotion } from '../lib/useData'
import { BarbellScene, FrameSequence } from './heroScene'

interface FrameManifest { count: number; desktop: string; mobile: string }

/**
 * هیروی سینمایی اسکرولی. بخش ۳۰۰vh ارتفاع دارد و صحنه با position: sticky ثابت می‌ماند؛
 * پیشرفت اسکرول (scrub) هم صحنهٔ canvas را جلو می‌برد و هم کلمات شعار را یکی‌یکی آشکار می‌کند.
 */
export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = useRef<HTMLSpanElement[]>([])
  const after = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLDivElement>(null)

  const [first, ...rest] = brand.slogan.split('؛').map((s) => s.trim())
  const restWords = (rest.join(' ') || '').split(/\s+/).filter(Boolean)

  useEffect(() => {
    const el = section.current!
    const cv = canvas.current!
    const reduced = prefersReducedMotion()
    let scene: BarbellScene | FrameSequence = new BarbellScene(cv)
    let target = reduced ? 0.95 : 0
    let current = target
    let raf = 0
    let visible = true

    // اگر توالی فریم ویدیو آماده باشد، جایگزین صحنهٔ رسم‌شده می‌شود
    fetch('/media/hero/frames/manifest.json')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
      .then((m: FrameManifest | null) => {
        if (!m?.count) return
        const mobile = window.innerWidth < 768
        const pattern = mobile ? m.mobile : m.desktop
        const urls = Array.from({ length: m.count }, (_, i) => pattern.replace('{n}', String(i + 1).padStart(4, '0')))
        scene = new FrameSequence(cv, urls)
      })
      .catch(() => {})

    const applyText = (p: number) => {
      restWords.forEach((_, i) => {
        const w = words.current[i]
        if (!w) return
        const start = 0.1 + i * 0.09
        const t = Math.min(1, Math.max(0, (p - start) / 0.08))
        w.style.opacity = String(t)
        w.style.transform = `translateY(${(1 - t) * 0.35}em)`
        w.style.filter = `blur(${(1 - t) * 8}px)`
      })
      const a = Math.min(1, Math.max(0, (p - 0.6) / 0.12))
      if (after.current) {
        after.current.style.opacity = String(a)
        after.current.style.transform = `translateY(${(1 - a) * 24}px)`
        after.current.style.pointerEvents = a > 0.5 ? 'auto' : 'none'
      }
      if (hint.current) hint.current.style.opacity = String(1 - Math.min(1, p / 0.08))
    }

    const loop = () => {
      current += (target - current) * 0.14
      if (Math.abs(target - current) < 0.0004) current = target
      scene.render(current)
      applyText(current)
      raf = visible && (current !== target || scene.busy) ? requestAnimationFrame(loop) : 0
    }
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(loop) }

    const st = reduced
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => { target = self.progress; kick() },
        })

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick() })
    io.observe(el)
    const onResize = () => { scene.resize(); scene.render(current) }
    window.addEventListener('resize', onResize)

    scene.render(current)
    applyText(current)
    kick()

    return () => {
      cancelAnimationFrame(raf)
      st?.kill()
      io.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} id="top" aria-labelledby="hero-title" className="relative h-[100svh] motion-safe:h-[300vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 md:px-8">
          <h1 id="hero-title" className="font-black leading-[0.95] tracking-tight" style={{ fontSize: 'clamp(3.2rem, 11vw, 10.5rem)' }}>
            <span className="block">{first}؛</span>
            <span className="mt-2 block text-[0.62em] font-extrabold text-chalk/95">
              {restWords.map((w, i) => (
                <span
                  key={i}
                  ref={(n) => { if (n) words.current[i] = n }}
                  className="inline-block will-change-[opacity,transform] motion-safe:opacity-0"
                >
                  {w}{i < restWords.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          </h1>

          <div ref={after} className="mt-10 max-w-xl motion-safe:opacity-0">
            <p className="lede text-chalk/80">
              {faNum(12)} شعبه در {brand.city}، سالن‌های جدای آقایان و بانوان، از بدنسازی تا صخره‌نوردی.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-plate" onClick={() => scrollToId('branches')}>نزدیک‌ترین شعبه به من</button>
              <button className="btn-ghost" onClick={() => scrollToId('packages')}>دیدن پکیج‌ها</button>
            </div>
          </div>
        </div>

        <div ref={hint} className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-sm text-rubber motion-reduce:hidden">
          <span>اسکرول کن تا وزنه بالا برود</span>
          <span className="block h-10 w-px animate-pulse bg-gradient-to-b from-plate-hi to-transparent" />
        </div>
      </div>
    </section>
  )
}
