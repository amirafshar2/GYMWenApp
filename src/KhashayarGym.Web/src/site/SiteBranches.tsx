import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, Phone, Navigation } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextReveal } from '@/components/ui/text-reveal'
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

/** «هرکجا هستی، خشایار نزدیکته» — کارت‌ها، Badge، Button و Text Reveal از 21st.dev + نقشهٔ زنده */
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

  return (
    <section id="branches" className="relative mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold md:text-6xl"><TextReveal text={brand.nearSlogan} className="!text-foreground" /></h2>
          <p className="mt-4 text-lg text-muted-foreground">{faNum(branches.length || 12)} شعبه در {brand.city}. موقعیتت را بده تا نزدیک‌ترین سالن را نشانت بدهیم.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="نوع سالن" className="flex rounded-full bg-muted p-1">
            {FILTERS.map((f) => (
              <button key={f.key} role="radio" aria-checked={filter === f.key} onClick={() => setFilter(f.key)}
                className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-colors', filter === f.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
          <Button size="lg" className="rounded-full shadow-[0_0_30px_rgba(3,103,254,0.45)]" onClick={locate} disabled={geo.status === 'locating'}>
            <LocateFixed className="size-4" />
            {geo.status === 'locating' ? 'در حال پیدا کردن…' : 'نزدیک‌ترین شعبه به من'}
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {geo.msg && <p className={geo.status === 'error' ? 'text-amber-300' : 'text-blue-300'}>{geo.msg}</p>}
        {error && <p className="text-amber-300">فهرست شعبه‌ها بارگذاری نشد. صفحه را دوباره بارگذاری کنید.</p>}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <ol className="order-2 max-h-[640px] space-y-3 overflow-y-auto overscroll-contain pl-1 lg:order-1" data-lenis-prevent>
          {shown.map(({ b, d }, i) => {
            const on = active === b.slug
            return (
              <li key={b.slug} id={`branch-${b.slug}`}>
                <Card className={cn('gap-0 p-5 transition-colors', on ? 'ring-2 ring-primary' : 'hover:bg-muted/60')}>
                  <button className="block w-full text-right" onClick={() => setActive(b.slug)} aria-pressed={on}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">{b.name}</h3>
                      {d !== null && <Badge variant={i === 0 ? 'default' : 'secondary'}>{i === 0 ? 'نزدیک‌ترین، ' : ''}{formatDistance(d)}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{b.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {b.hasMen && <Badge variant="outline" className="border-blue-500/50 text-blue-300">آقایان</Badge>}
                      {b.hasWomen && <Badge variant="outline" className="border-fuchsia-400/50 text-fuchsia-300">بانوان</Badge>}
                      {!b.addressConfirmed && <Badge variant="outline">آدرس دقیق به‌زودی</Badge>}
                    </div>
                  </button>
                  {on && (
                    <div className="mt-4 space-y-3 border-t pt-4 text-sm">
                      {b.menHours && <p><span className="text-muted-foreground">سانس آقایان: </span>{b.menHours}</p>}
                      {b.womenHours && <p><span className="text-muted-foreground">سانس بانوان: </span>{b.womenHours}</p>}
                      {b.disciplines.length > 0 && <p><span className="text-muted-foreground">رشته‌ها: </span>{b.disciplines.join('، ')}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {b.phone && <Button asChild size="sm" className="rounded-full"><a href={`tel:${b.phone}`}><Phone className="size-4" />{faDigits(b.phone)}</a></Button>}
                        {routes(b).map((r) => (
                          <Button key={r.label} asChild size="sm" variant="outline" className="rounded-full">
                            <a href={r.href} target="_blank" rel="noopener noreferrer"><Navigation className="size-4" />{r.label}</a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ol>
        <div ref={mapBox} className="relative order-1 h-[420px] overflow-hidden rounded-xl border bg-card lg:order-2 lg:h-[640px]">
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
