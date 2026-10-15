import { useEffect, useState } from 'react'
import GlassRefractionHero from '@/components/ui/glass-refraction-hero'
import { HeroScrub } from '@/components/ui/hero-scrub'
import { brand } from '@/lib/brand'
import { faNum } from '@/lib/fa'

interface FrameManifest { count: number; desktop: string; mobile: string }
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/**
 * هیرو: Glass Refraction Hero از 21st.dev (آبی برند).
 * اگر فریم‌های ویدیوی باشگاه ساخته شده باشد (scripts/make-hero-frames)، Hero Scrub از 21st.dev نمایش داده می‌شود.
 */
export default function SiteHero() {
  const [frames, setFrames] = useState<FrameManifest | null>(null)
  useEffect(() => {
    fetch('/media/hero/frames/manifest.json')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
      .then((m: FrameManifest | null) => { if (m?.count) setFrames(m) })
      .catch(() => {})
  }, [])

  const description = `${faNum(12)} شعبه در ${brand.city}، سالن‌های جدای آقایان و بانوان، از بدنسازی تا صخره‌نوردی.`

  if (frames) {
    const [first, ...rest] = brand.slogan.split('؛').map((s) => s.trim())
    const pattern = window.innerWidth < 768 ? frames.mobile : frames.desktop
    return (
      <div id="top">
        <HeroScrub
          frameCount={frames.count}
          frameUrl={(i) => pattern.replace('{n}', String(i + 1).padStart(4, '0'))}
          titleTop={`${first}؛`}
          titleBottom={rest.join(' ')}
          srTitle={brand.slogan}
        />
      </div>
    )
  }

  return (
    <div id="top">
      <GlassRefractionHero
        title={brand.slogan}
        description={description}
        primaryAction={{ label: 'نزدیک‌ترین شعبه به من', onClick: () => go('branches') }}
        secondaryAction={{ label: 'دیدن پکیج‌ها', onClick: () => go('packages') }}
      />
    </div>
  )
}
