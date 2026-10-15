import { GlowCard, GlowCardGrid } from '@/components/ui/glow-card-grid'
import { SectionHead } from './ui/SectionHead'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum } from '@/lib/fa'

/** آواتار موقت: حرف اول نام روی دایرهٔ آبی (تا عکس واقعی مربی برسد) */
const avatar = (name: string, women: boolean) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${women ? '#8e3f86' : '#2c6bae'}"/><stop offset="1" stop-color="${women ? '#5c2a57' : '#151514'}"/></linearGradient></defs><circle cx="40" cy="40" r="40" fill="url(#g)"/><text x="40" y="52" text-anchor="middle" font-family="Vazirmatn, Tahoma" font-size="34" font-weight="800" fill="#fff">${name.trim()[0]}</text></svg>`)

/** مربیان — Team Section with Glow Cards از 21st.dev، با سرتیتر هم‌سبک هیرو */
export default function SiteCoaches() {
  const { data: coaches = [] } = useData('coaches', api.coaches)
  return (
    <section id="coaches" aria-labelledby="coaches-title" className="mx-auto max-w-[1440px] px-[clamp(20px,3.2vw,48px)] py-[clamp(72px,9vw,140px)]">
      <SectionHead id="coaches-title" eyebrow="مربیان" title="کسانی که" accent="کنارت تمرین می‌کنند." body="مربی آقایان برای سالن آقایان، مربی بانوان برای سالن بانوان؛ همه با مدرک فدراسیون." />
      <div className="mt-16">
        <GlowCardGrid className="lg:grid-cols-3">
          {coaches.map((c) => (
            <GlowCard
              key={c.slug}
              name={c.fullName}
              handle={`${c.specialty} · ${faNum(c.yearsOfExperience)} سال سابقه`}
              avatar={c.photoUrl ?? avatar(c.fullName, c.section === 'Women')}
            />
          ))}
        </GlowCardGrid>
      </div>
    </section>
  )
}
