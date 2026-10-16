import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import TokyoSkylineHero from '@/components/ui/sunset-skyline-hero'

/**
 * ویدیوی خود باشگاه: public/media/video/gym.mp4 (با scripts/make-scrub-video بهینه شده؛ حدود ۳٫۵ مگابایت).
 * پوستر: gym-poster.webp و gym-poster-mobile.webp — فریمی از همین ویدیو.
 */
// ?v= با هر ویدیوی تازه عوض شود تا کش قدیمی مرورگر دور زده شود
const GYM_VIDEO = '/media/video/gym.mp4?v=owner-2'
const POSTER = '/media/video/gym-poster.webp?v=photo-1'
const POSTER_MOBILE = '/media/video/gym-poster-mobile.webp?v=photo-1'
const TITLE = 'هر روز، یک تکرار بیشتر.'

type Conn = { saveData?: boolean; effectiveType?: string }

/**
 * گوشی، اینترنت کند، حالت کم‌مصرف یا دستگاه ضعیف → فقط عکس (بدون دانلود ویدیو).
 * دسکتاپ معمولی → ویدیوی اسکرولی.
 */
function prefersLite(): boolean {
  if (typeof window === 'undefined') return true
  const nav = navigator as Navigator & { connection?: Conn; deviceMemory?: number }
  const mq = (q: string) => window.matchMedia?.(q).matches ?? false
  if (mq('(prefers-reduced-motion: reduce)')) return true
  if (mq('(max-width: 900px)') || mq('(pointer: coarse)')) return true
  const c = nav.connection
  if (c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType ?? '')) return true
  if ((nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) < 4) return true
  return false
}

/**
 * بخش ویدیویی وسط صفحه — Sunset Skyline Hero از 21st.dev (guglielmogiannattasio).
 * ویدیو اول کامل در حافظه دانلود می‌شود و بعد اسکرول فعال می‌شود، تا جلو/عقب رفتن بدون مکث باشد.
 */
export default function SiteVideo() {
  const [lite] = useState(prefersLite)
  const [src, setSrc] = useState<string | null | undefined>(undefined)
  const [near, setNear] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // دانلود فقط وقتی کاربر به این بخش نزدیک شد (نه با باز شدن صفحه)؛ فاصلهٔ کافی تا قبل از رسیدن آماده باشد
  useEffect(() => {
    if (lite || near || !box.current) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true) }, { rootMargin: '1600px 0px' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [lite, near, src])

  useEffect(() => {
    if (!near) return
    let url: string | null = null
    let alive = true
    fetch(GYM_VIDEO)
      .then((r) => (r.ok && r.headers.get('content-type')?.startsWith('video/') ? r.blob() : null))
      .then((b) => { if (!alive) return; url = b ? URL.createObjectURL(b) : null; setSrc(url) })
      .catch(() => alive && setSrc(null))
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [near])

  if (lite || src === null) return <PosterSection />
  if (src === undefined) {
    // تا ویدیو کامل نرسیده، همان فریم به‌صورت عکس نشان داده می‌شود (جای خالی سیاه نیست)
    return (
      <div ref={box} className="relative h-[100dvh] overflow-hidden bg-[#151514]" aria-hidden>
        <img src={POSTER} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 22%' }} />
      </div>
    )
  }
  return (
    <section aria-label={`ویدیوی تمرین در سالن ${brand.shortName}`}>
      <TokyoSkylineHero
        midPage
        showNav={false}
        videoSrc={src}
        skylineSrc=""
        title={TITLE}
        brandMark={brand.shortName}
        videoPosition="50% 22%"
        scrollHint="اسکرول کن"
        signature={{ name: 'guglielmogiannattasio', url: 'https://www.guglielmogiannattasio.it' }}
        fontFamily="'Vazirmatn Variable', Tahoma, sans-serif"
        scrubDistance={2400}
      />
    </section>
  )
}

/** نسخهٔ سبک: یک عکس از همان ویدیو با شعار، بدون اسکرول قفل‌شده و بدون دانلود ویدیو */
function PosterSection() {
  return (
    <section aria-label={`تمرین در سالن ${brand.shortName}`} className="relative h-[78svh] min-h-[460px] overflow-hidden bg-[#151514]">
      <picture>
        <source media="(max-width: 760px)" srcSet={POSTER_MOBILE} />
        <img src={POSTER} alt={`تمرین در سالن ${brand.shortName}`} loading="lazy" decoding="async"
          className="absolute inset-0 size-full object-cover" style={{ objectPosition: '50% 22%' }} />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-[#151514] via-[#151514]/30 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-12 text-center sm:pb-16">
        <p className="text-[15px] font-bold tracking-wide text-[#fff4e8]/80">{brand.shortName}</p>
        <h2 className="mt-2 text-[34px] font-black leading-tight text-[#fff4e8] sm:text-[52px]">{TITLE}</h2>
      </div>
    </section>
  )
}
