import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { prefersReducedMotion } from './useData'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** اسکرول نرم Lenis هماهنگ با GSAP ScrollTrigger. در حالت کاهش حرکت غیرفعال است. */
export function startSmoothScroll() {
  // روی دستگاه‌های لمسی اسکرول بومی بهتر است؛ Lenis فقط برای ماوس/تاچ‌پد و بعد از بارگذاری اولیه
  if (lenis || prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return
  const start = () => {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis?.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  }
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 })
  else setTimeout(start, 1200)
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

export { gsap, ScrollTrigger }
