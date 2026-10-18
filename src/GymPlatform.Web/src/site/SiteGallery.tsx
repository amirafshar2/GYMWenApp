import { motion } from 'motion/react'
import { Gallery, GalleryGrid, GalleryImage } from '@/components/ui/shared-element-gallery'
import { fill, site } from '@/lib/site'
import { Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** گالری — Shared Element Gallery از 21st.dev: با کلیک عکس بزرگ می‌شود، با کشیدن به بالا/پایین بسته می‌شود */
export default function SiteGallery() {
  const fade = useFadeUp()
  const IMAGES = site.home.gallery.images.filter((x) => x.imageUrl).map((x, k) => ({ id: `g${k}`, src: x.imageUrl!, alt: x.title }))
  if (!IMAGES.length) return null
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
        <motion.header {...fade} className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>گالری</Eyebrow>
            <h2 id="gallery-title" className="mt-3 text-[clamp(1.9rem,3.4vw,3rem)] font-bold leading-[1.3] text-chalk">{fill(site.home.gallery.title)}</h2>
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
