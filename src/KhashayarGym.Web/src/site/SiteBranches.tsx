import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, Phone, Navigation } from 'lucide-react'
import { SectionHead } from './ui/SectionHead'
import { api, type Branch } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { distanceKm, faDigits, faNum, formatDistance } from '@/lib/fa'
import { cn } from '@/lib/utils'

const BranchMap = lazy(() => import('@/components/BranchMap'))
type Filter = 'all' | 'men' | 'women'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'همه' }, { key: 'men', label: 'آقایان' }, { key: 'women', label: 'بانوان' },
]
const routes = (b: Branch) => [
  { label: 'نشان', href: `https://neshan.org/maps/@${b.latitude},${b.longitude},16z,0p` },
  { label: 'بلد', href: `https://balad.ir/location?latitude=${b.latitude}&longitude=${b.longitude}&zoom=16` },
  { label: 'گوگل‌مپ', href: `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}` },
]

/** «هرکجا هستی، خشایار نزدیکته» — نقشهٔ روشن + فهرست مویی شعبه‌ها، هم‌سبک هیرو */
export default function SiteBranches() {
  const { data: branches = [], error } = useData('branches', api.branches)
  const [filter, setFilter] = useState<Filter>('all')
  const [active, setActive] = useState<string | null>(null)
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null)
  const [geo, setGeo] = useState<{ status: 'idle' | 'locating' | 'done' | 'error'; msg?: string }>({ status: 'idle' })
  const [mapOn, setMapOn] = useState(false)
  const mapBox = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMapOn(true); io.disconnect() } }, { rootMargin: '400px' })
    if (mapBox.current) io.observe(mapBox.current)
    return () => io.disconnect()
  }, [])

  const matches = (b: Branch) => filter === 'all' || (filter === 'men' ? b.hasMen : b.hasWomen)
  const ranked = useMemo(() => {
    const l = branches.map((b) => ({ b, d: user ? distanceKm(user, { lat: b.latitude, lng: b.longitude }) : null }))
    if (user) l.sort((a, b) => a.d! - b.d!)
    return l
  }, [branches, user])
  const dimmed = useMemo(() => new Set(branches.filter((b) => !matches(b)).map((b) => b.slug)), [branches, filter]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = ranked.filter(({ b }) => matches(b))

  const locate = () => {
    if (!('geolocation' in navigator)) return setGeo({ status: 'error', msg: 'مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند. شعبه را از روی نقشه انتخاب کنید.' })
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const u = { lat: p.coords.latitude, lng: p.coords.longitude } // فقط در مرورگر؛ به سرور ارسال نمی‌شود
        setUser(u)
        const near = branches.filter(matches).map((b) => ({ b, d: distanceKm(u, { lat: b.latitude, lng: b.longitude }) })).sort((a, b) => a.d - b.d)[0]
        if (near) setActive(near.b.slug)
        setGeo({ status: 'done', msg: near && near.d > 60 ? `به نظر می‌رسد بیرون از ${brand.city} هستید؛ شعبه‌ها بر اساس فاصله مرتب شدند.` : 'شعبه‌ها بر اساس فاصله از شما مرتب شدند.' })
      },
      (err) => setGeo({ status: 'error', msg: err.code === err.PERMISSION_DENIED ? 'اجازهٔ موقعیت داده نشد. از تنظیمات مرورگر اجازه دهید یا شعبه را از روی نقشه انتخاب کنید.' : 'موقعیت شما پیدا نشد. دوباره امتحان کنید.' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const [nearSlogan1, nearSlogan2] = brand.nearSlogan.split('،').map((x) => x.trim())
  return (
    <section id="branches" aria-labelledby="branches-title" className="relative mx-auto max-w-[1440px] px-[clamp(20px,3.2vw,48px)] py-[clamp(72px,9vw,140px)]">
      <SectionHead
        id="branches-title"
        eyebrow={`${faNum(branches.length || 12)} شعبه در ${brand.city}`}
        title={`${nearSlogan1}،`}
        accent={nearSlogan2}
        body="موقعیتت را بده تا نزدیک‌ترین سالن را نشانت بدهیم. موقعیت فقط در مرورگر خودت می‌ماند."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={locate} disabled={geo.status === 'locating'}
              className="inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full bg-chalk px-6 text-[15px] font-medium text-iron transition-transform duration-300 hover:-translate-y-px disabled:opacity-60">
              <LocateFixed className="size-4" aria-hidden />
              {geo.status === 'locating' ? 'در حال پیدا کردن…' : 'نزدیک‌ترین شعبه به من'}
            </button>
            <div role="radiogroup" aria-label="نوع سالن" className="flex rounded-full border border-chalk/20 p-1">
              {FILTERS.map((f) => (
                <button key={f.key} role="radio" aria-checked={filter === f.key} onClick={() => setFilter(f.key)}
                  className={cn('h-10 min-w-11 cursor-pointer rounded-full px-4 text-sm transition-colors duration-200', filter === f.key ? 'bg-chalk text-iron' : 'text-rubber hover:text-chalk')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div aria-live="polite" className="mt-6 min-h-6 text-sm">
        {geo.msg && <p className={geo.status === 'error' ? 'text-[#a4361f]' : 'text-plate'}>{geo.msg}</p>}
        {error && <p className="text-[#a4361f]">فهرست شعبه‌ها بارگذاری نشد. صفحه را دوباره بارگذاری کنید.</p>}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <ol className="order-2 max-h-[640px] overflow-y-auto overscroll-contain border-t border-chalk/15 lg:order-1" data-lenis-prevent>
          {shown.map(({ b, d }, i) => {
            const on = active === b.slug
            return (
              <li key={b.slug} id={`branch-${b.slug}`} className="border-b border-chalk/15">
                <button className="flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-right transition-colors duration-200 hover:bg-chalk/[.03]" onClick={() => setActive(b.slug)} aria-expanded={on}>
                  <span className="min-w-0">
                    <span className={cn('block text-lg font-medium', on && 'text-plate')}>{b.name}</span>
                    <span className="mt-1 block text-sm text-rubber">{b.address}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-rubber">
                      {b.hasMen && <span>آقایان</span>}
                      {b.hasWomen && <span className="text-women">بانوان</span>}
                      {!b.addressConfirmed && <span>آدرس دقیق به‌زودی</span>}
                    </span>
                  </span>
                  {d !== null && (
                    <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs', i === 0 ? 'bg-chalk text-iron' : 'border border-chalk/20 text-rubber')}>
                      {i === 0 ? 'نزدیک‌ترین، ' : ''}{formatDistance(d)}
                    </span>
                  )}
                </button>
                {on && (
                  <div className="space-y-2.5 pb-6 text-sm">
                    {b.menHours && <p><span className="text-rubber">سانس آقایان: </span>{b.menHours}</p>}
                    {b.womenHours && <p><span className="text-rubber">سانس بانوان: </span>{b.womenHours}</p>}
                    {b.disciplines.length > 0 && <p><span className="text-rubber">رشته‌ها: </span>{b.disciplines.join('، ')}</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {b.phone && <a href={`tel:${b.phone}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-chalk px-4 text-iron"><Phone className="size-4" aria-hidden />{faDigits(b.phone)}</a>}
                      {routes(b).map((r) => (
                        <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-chalk/20 px-4 transition-colors hover:border-chalk"><Navigation className="size-4" aria-hidden />{r.label}</a>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <div ref={mapBox} className="relative order-1 h-[420px] overflow-hidden rounded-[16px] bg-steel lg:order-2 lg:h-[640px]">
          {mapOn && branches.length > 0 && (
            <Suspense fallback={null}>
              <BranchMap branches={branches} visibleCount={99} activeSlug={active} dimmed={dimmed} user={user} onSelect={(s) => { setActive(s); document.getElementById(`branch-${s}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  )
}
