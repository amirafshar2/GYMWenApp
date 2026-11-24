import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import { fill, site } from '@/lib/site'

/**
 * Videobereich in der Seitenmitte. Zwei Modi (aus den „Website-Einstellungen“):
 * - scrub: Das Video läuft beim Scrollen vor und zurück (-scrub-Versionen mit Keyframe alle 4 Frames, passend zur Geräteleistung)
 * - loop: automatisch, stumm und in Schleife
 * Das Bild des ersten Frames liegt immer unter dem Video; die Seite ist nie leer.
 */

type Conn = { saveData?: boolean; effectiveType?: string }
export type Variant = 'image' | '540' | '720' | '1080'

/** Version nach Gerät und Internet wählen (gemessene Tabelle) */
export function pickVariant(): Variant {
  if (typeof window === 'undefined') return 'image'
  const nav = navigator as Navigator & { connection?: Conn; deviceMemory?: number }
  const c = nav.connection
  const net = c?.effectiveType ?? ''
  if (c?.saveData || /(^|-)2g$/.test(net) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'image'
  const cores = navigator.hardwareConcurrency ?? 8
  const mem = nav.deviceMemory ?? 8
  if (cores <= 2 || mem <= 2 || net === '3g') return '540'
  if (cores <= 4 || mem <= 4 || window.innerWidth < 1280) return '720'
  return '1080'
}

/** Standarddateien der Vorlage bekommen ?v=, um alte Browser-Caches zu umgehen */
const BUILTIN_VERSION = 'scrub-4'
const withVersion = (u: string) => (u.startsWith('/media/video/') ? `${u}?v=${BUILTIN_VERSION}` : u)
const photoVersion = (u: string) => (u.startsWith('/media/video/') ? `${u}?v=photo-1` : u)

/** Adressen der Versionen; ist das Video nicht optimiert, überall die Originaldatei */
export function videoUrls(url: string, optimized: boolean) {
  const clean = url.split('?')[0]
  const base = clean.replace(/\.mp4$/, '')
  if (!optimized) return { scrub: { '1080': url, '720': url, '540': url }, loop: url, frame: null as string | null, frameSmall: null as string | null }
  return {
    scrub: { '1080': withVersion(`${base}-scrub.mp4`), '720': withVersion(`${base}-scrub-720.mp4`), '540': withVersion(`${base}-scrub-540.mp4`) },
    loop: withVersion(`${base}.mp4`),
    frame: withVersion(`${base}.jpg`),
    frameSmall: withVersion(`${base}-960.jpg`),
  }
}

function cfg() {
  const v = site.home.video
  const posterPhoto = v.posterUrl || '/media/video/gym-poster.webp'
  const urls = v.videoUrl ? videoUrls(v.videoUrl, v.optimized !== false) : null
  const small = typeof window !== 'undefined' && window.innerWidth < 960
  // Hinter dem Video: erster Frame des Videos (ohne Sprung); sonst das vom Inhaber gewählte Bild
  const frame = (small ? urls?.frameSmall : urls?.frame) ?? photoVersion(posterPhoto)
  return { urls, frame, posterPhoto, posterMobile: v.mobilePosterUrl || posterPhoto, title: fill(v.title), mode: v.mode === 'loop' ? 'loop' : 'scrub' }
}

export default function SiteVideo() {
  const c = cfg()
  const [variant] = useState(pickVariant)
  if (!c.urls || variant === 'image') return <PosterSection />
  return c.mode === 'loop' ? <LoopVideo src={c.urls.loop} frame={c.frame} title={c.title} /> : <ScrubVideo src={c.urls.scrub[variant]} frame={c.frame} title={c.title} />
}

/** Fester Header (78 px + 1 px Linie) + Aktions-/Demoleiste; der Videorahmen sitzt genau darunter und füllt den Rest */
const BAR = 'calc(79px + var(--festival-h, 0px))'
const STAGE = { top: BAR, height: `calc(100vh - ${BAR})` }

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/**
 * Scroll-Video: Bereich 320vh mit sticky-Kind in Bildschirmhöhe. Eine requestAnimationFrame-Schleife (kein scroll-Event)
 * holt die Zielzeit aus der Scrollposition, glättet sie und sendet jeweils nur ein seek.
 */
function ScrubVideo({ src, frame, title }: { src: string; frame: string; title: string }) {
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const text = useRef<HTMLDivElement>(null)
  const stick = useRef<HTMLDivElement>(null)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const [near, setNear] = useState(false)

  // Download erst, wenn der Nutzer sich dem Bereich nähert (nicht beim Öffnen der Seite)
  useEffect(() => {
    const el = section.current
    if (!el || near) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true) }, { rootMargin: '1600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  // Ganze Datei im Speicher (blob), damit seek nicht vom Netz abhängt; sonst die Adresse selbst
  useEffect(() => {
    if (!near) return
    let url: string | null = null
    let alive = true
    fetch(src)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => { if (!alive) return; url = URL.createObjectURL(b); setBlobSrc(url) })
      .catch(() => alive && setBlobSrc(src))
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [near, src])

  useEffect(() => {
    const v = video.current, el = section.current
    if (!v || !el || !blobSrc) return
    let raf = 0, visible = false, current = 0, seekAt = 0, ready = false
    // Decoder aufwärmen: ohne kurzes play/pause hängen spätere seeks in manchen Browsern
    const warm = () => { const p = v.play(); if (p) p.then(() => v.pause()).catch(() => {}) }
    const onData = () => { ready = true; warm() }
    v.addEventListener('loadeddata', onData)
    const firstInput = () => { warm(); off() }
    const evs = ['touchstart', 'pointerdown', 'wheel', 'keydown'] as const
    const off = () => evs.forEach((e) => window.removeEventListener(e, firstInput))
    evs.forEach((e) => window.addEventListener(e, firstInput, { passive: true, once: true }))

    const tick = () => {
      raf = 0
      if (!visible) return
      // Der Videorahmen haftet unter dem festen Header: der Scrollbeginn ist, wenn die Bereichsoberkante den Header-Boden erreicht
      const r = el.getBoundingClientRect()
      const stage = stick.current
      const offset = stage ? parseFloat(getComputedStyle(stage).top) || 0 : 0
      const span = r.height - (stage?.offsetHeight ?? window.innerHeight)
      const progress = clamp(span > 0 ? (offset - r.top) / span : 0)
      if (text.current) {
        const t = clamp((progress - 0.08) / 0.25)
        text.current.style.opacity = String(t)
        text.current.style.transform = `translateY(${(1 - t) * 24}px)`
      }
      const d = v.duration
      if (ready && d > 0) {
        const target = progress * (d - 0.04)
        current += (target - current) * 0.22
        if (Math.abs(target - current) < 0.002) current = target
        v.dataset.target = target.toFixed(3) // zum Messen des Abstands im Test
        const now = performance.now()
        if (!v.seeking && Math.abs(v.currentTime - current) > 0.012) { v.currentTime = current; seekAt = now }
        else if (v.seeking && now - seekAt > 700) { warm(); seekAt = now } // Wächter: seek hängt
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf); v.removeEventListener('loadeddata', onData); off() }
  }, [blobSrc])

  return (
    <section ref={section} aria-label={`Trainingsvideo im Studio ${brand.shortName}`} className="relative h-[320vh] bg-[#151514]">
      <div ref={stick} className="sticky overflow-hidden" style={STAGE}>
        <img src={frame} alt="" decoding="async" className="absolute inset-0 size-full object-cover" />
        {blobSrc && (
          <video ref={video} src={blobSrc} muted playsInline preload="auto" disablePictureInPicture aria-hidden
            className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151514]/80 via-transparent to-[#151514]/30" aria-hidden />
      </div>
      {/* Text über dem Video in eigener Ebene mit eigenem sticky */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky flex items-end justify-center px-6 pb-[12vh] text-center" style={STAGE}>
          <div ref={text} style={{ opacity: 0 }}>
            <p className="text-[15px] font-bold tracking-wide text-[#fff4e8]/80">{brand.shortName}</p>
            <h2 className="mt-2 text-[34px] font-black leading-tight text-[#fff4e8] sm:text-[56px]">{title}</h2>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Automatisch, stumm und in Schleife; nur wenn sichtbar */
function LoopVideo({ src, frame, title }: { src: string; frame: string; title: string }) {
  const box = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setOn(true)
      const v = video.current
      if (v) { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={box} aria-label={`Trainingsvideo im Studio ${brand.shortName}`} className="relative h-[78svh] min-h-[460px] overflow-hidden bg-[#151514]">
      <img src={frame} alt="" decoding="async" loading="lazy" className="absolute inset-0 size-full object-cover" />
      {on && <video ref={video} src={src} muted playsInline autoPlay loop preload="auto" disablePictureInPicture aria-hidden className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#151514] via-[#151514]/30 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-12 text-center sm:pb-16">
        <p className="text-[15px] font-bold tracking-wide text-[#fff4e8]/80">{brand.shortName}</p>
        <h2 className="mt-2 text-[34px] font-black leading-tight text-[#fff4e8] sm:text-[52px]">{title}</h2>
      </div>
    </section>
  )
}

/** Ohne Video (Sparmodus, 2G oder reduzierte Bewegung): das vom Inhaber gewählte Bild mit Slogan */
function PosterSection() {
  const { posterPhoto, posterMobile, title } = cfg()
  return (
    <section aria-label={`Training im Studio ${brand.shortName}`} className="relative h-[78svh] min-h-[460px] overflow-hidden bg-[#151514]">
      <picture>
        <source media="(max-width: 760px)" srcSet={photoVersion(posterMobile)} />
        <img src={photoVersion(posterPhoto)} alt={`Training im Studio ${brand.shortName}`} loading="lazy" decoding="async"
          className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 22%' }} />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-[#151514] via-[#151514]/30 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-12 text-center sm:pb-16">
        <p className="text-[15px] font-bold tracking-wide text-[#fff4e8]/80">{brand.shortName}</p>
        <h2 className="mt-2 text-[34px] font-black leading-tight text-[#fff4e8] sm:text-[52px]">{title}</h2>
      </div>
    </section>
  )
}
