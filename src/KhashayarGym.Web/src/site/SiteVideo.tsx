import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import TokyoSkylineHero from '@/components/ui/sunset-skyline-hero'

/** ویدیوی خود باشگاه: public/media/video/gym.mp4 (برای اسکرول نرم، فایل با scripts/make-scrub-video بهینه شده — همهٔ فریم‌ها کلیدی) */
// ?v= با هر ویدیوی تازه عوض شود تا کش قدیمی مرورگر دور زده شود
const GYM_VIDEO = '/media/video/gym.mp4?v=owner-1'

/**
 * بخش ویدیویی وسط صفحه — Sunset Skyline Hero از 21st.dev (guglielmogiannattasio).
 * با رسیدن بخش به بالای صفحه، اسکرول ویدیو را جلو/عقب می‌برد و در پایان «خشایار» ظاهر می‌شود.
 */
export default function SiteVideo() {
  const [src, setSrc] = useState<string | null | undefined>(undefined)
  const [near, setNear] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  // سرعت: ویدیو (چند مگابایت) فقط وقتی کاربر به این بخش نزدیک شد دانلود می‌شود، نه با باز شدن صفحه
  useEffect(() => {
    if (near || !box.current) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true) }, { rootMargin: '600px 0px' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [near, src])
  useEffect(() => {
    if (!near) return
    fetch(GYM_VIDEO, { method: 'HEAD' })
      .then((r) => setSrc(r.ok && r.headers.get('content-type')?.startsWith('video/') ? GYM_VIDEO : null))
      .catch(() => setSrc(null))
  }, [near])

  if (src === undefined) return <div ref={box} className="h-[100dvh] bg-[#151514]" aria-hidden />
  if (src === null) {
    // تا ویدیوی باشگاه نرسیده: جای خالی با توضیح (ویدیوی نمونهٔ دیگری نمایش داده نمی‌شود)
    return (
      <section aria-label="ویدیوی باشگاه" className="grid h-[70dvh] place-items-center bg-[#151514] px-6 text-center text-[#fff4e8]/70">
        <p className="max-w-md leading-8">[ویدیوی داخل سالن خشایار]<br />فایل را در <span dir="ltr">public/media/video/gym.mp4</span> بگذارید.</p>
      </section>
    )
  }
  return (
    <section aria-label="ویدیوی مدیر باشگاه در سالن خشایار">
      <TokyoSkylineHero
        midPage
        showNav={false}
        videoSrc={src}
        skylineSrc=""
        title="هر روز، یک تکرار بیشتر."
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
