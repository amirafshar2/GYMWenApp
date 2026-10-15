import { GlowCard, GlowCardGrid } from '@/components/ui/glow-card-grid'
import { TextReveal } from '@/components/ui/text-reveal'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import { faNum } from '@/lib/fa'

/** آواتار موقت: حرف اول نام روی دایرهٔ آبی (تا عکس واقعی مربی برسد) */
const avatar = (name: string, women: boolean) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${women ? '#a855f7' : '#0367FE'}"/><stop offset="1" stop-color="${women ? '#ec4899' : '#0A1DCB'}"/></linearGradient></defs><circle cx="40" cy="40" r="40" fill="url(#g)"/><text x="40" y="52" text-anchor="middle" font-family="Vazirmatn, Tahoma" font-size="34" font-weight="800" fill="#fff">${name.trim()[0]}</text></svg>`)

/** مربیان — Team Section with Glow Cards از 21st.dev */
export default function SiteCoaches() {
  const { data: coaches = [] } = useData('coaches', api.coaches)
  return (
    <section id="coaches" className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <h2 className="text-4xl font-bold md:text-6xl"><TextReveal text="مربی‌ها" className="!text-foreground" /></h2>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">مربی آقایان برای سالن آقایان، مربی بانوان برای سالن بانوان. همه با مدرک فدراسیون.</p>
      <div className="mt-12">
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
