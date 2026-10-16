import { motion } from 'motion/react'
import { Gallery, GalleryGrid, GalleryImage } from '@/components/ui/shared-element-gallery'
import { brand } from '@/lib/brand'
import { Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/**
 * عکس‌های گالری — فعلاً فریم‌هایی از ویدیوهای باشگاه (محلی، بدون نیاز به اینترنت).
 * عکس‌های واقعی سالن‌ها را در public/media/gallery بگذارید و این فهرست را عوض کنید.
 */
const IMAGES = [
  { id: 'g1', src: '/media/gallery/hall-light.webp', alt: 'سالن تجهیزات با نور سقفی' },
  { id: 'g2', src: '/media/gym/lift-tall.webp', alt: 'ددلیفت در سالن آزاد' },
  { id: 'g3', src: '/media/gym/grip.webp', alt: 'گرفتن هالتر با دست گچ‌خورده' },
  { id: 'g4', src: '/media/gallery/athlete-back.webp', alt: 'ورزشکار زیر نور سالن' },
  { id: 'g5', src: '/media/gym/dumbbells-tall.webp', alt: 'ردیف دمبل‌ها' },
  { id: 'g6', src: '/media/gallery/athlete-wide.webp', alt: 'سالن بدنسازی با نورپردازی قرمز' },
  { id: 'g7', src: '/media/gym/rack-tall.webp', alt: 'تمرین کنار رک دمبل' },
  { id: 'g8', src: '/media/gym/rack.webp', alt: 'نمای سالن و رک‌ها' },
  { id: 'g9', src: '/media/gallery/athlete-close.webp', alt: 'تمرکز قبل از تمرین' },
  { id: 'g10', src: '/media/gym/grip-tall.webp', alt: 'آماده برای تکرار بعدی' },
  { id: 'g11', src: '/media/gym/lift.webp', alt: 'تمرین قدرتی در سالن' },
  { id: 'g12', src: '/media/gym/empty-tall.webp', alt: 'دستگاه‌های سالن' },
]

/** گالری — Shared Element Gallery از 21st.dev: با کلیک عکس بزرگ می‌شود، با کشیدن به بالا/پایین بسته می‌شود */
export default function SiteGallery() {
  const fade = useFadeUp()
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <motion.header {...fade} className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>گالری</Eyebrow>
            <h2 id="gallery-title" className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] font-bold leading-[1.3] text-chalk">داخل سالن‌های {brand.shortName}</h2>
          </div>
          <p className="max-w-md text-[15px] leading-7 text-rubber">روی هر عکس بزن تا بزرگ شود؛ برای بستن، عکس را به بالا یا پایین بکش یا Esc بزن.</p>
        </motion.header>
        <Gallery>
          <GalleryGrid>
            {IMAGES.map((img) => <GalleryImage key={img.id} id={img.id} src={img.src} alt={img.alt} />)}
          </GalleryGrid>
        </Gallery>
      </div>
    </section>
  )
}
