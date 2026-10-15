import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { api, type Branch } from '../lib/api'
import { useData } from '../lib/useData'
import { brand } from '../lib/brand'
import { distanceKm, faDigits, faNum, formatDistance } from '../lib/fa'
import { ScrollTrigger } from '../lib/motion'

const BranchMap = lazy(() => import('../components/BranchMap'))

type Filter = 'all' | 'men' | 'women'
type GeoState = { status: 'idle' | 'locating' | 'done' | 'error'; message?: string; far?: boolean }

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'men', label: 'آقایان' },
  { key: 'women', label: 'بانوان' },
]

const routeLinks = (b: Branch) => [
  { label: 'نشان', href: `https://neshan.org/maps/@${b.latitude},${b.longitude},16z,0p` },
  { label: 'بلد', href: `https://balad.ir/location?latitude=${b.latitude}&longitude=${b.longitude}&zoom=16` },
  { label: 'گوگل‌مپ', href: `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}` },
]

/** «هرکجا هستی، خشایار نزدیکته» — نقشهٔ زندهٔ شعبه‌ها + نزدیک‌ترین شعبه با Geolocation */
export default function Branches({ standalone = false }: { standalone?: boolean }) {
  const { data: branches = [], error } = useData('branches', api.branches)
  const [filter, setFilter] = useState<Filter>('all')
  const [active, setActive] = useState<string | null>(null)
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
  const [mapOn, setMapOn] = useState(false)
  const [visibleCount, setVisibleCount] = useState(standalone ? 99 : 0)
  const section = useRef<HTMLElement>(null)
  const mapBox = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // کتابخانهٔ نقشه فقط وقتی این بخش نزدیک دید شد بارگذاری می‌شود
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMapOn(true); io.disconnect() } }, { rootMargin: '400px' })
    if (mapBox.current) io.observe(mapBox.current)
    return () => io.disconnect()
  }, [])

  // پین‌ها با اسکرول یکی‌یکی ظاهر می‌شوند
  useEffect(() => {
    if (standalone || !section.current || !branches.length) return
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: 'top 85%',
      end: 'top 15%',
      onUpdate: (s) => setVisibleCount((c) => Math.max(c, Math.ceil(s.progress * branches.length))),
      onLeave: () => setVisibleCount(branches.length),
    })
    return () => st.kill()
  }, [branches.length, standalone])

  const ranked = useMemo(() => {
    const list = branches.map((b) => ({ b, d: user ? distanceKm(user, { lat: b.latitude, lng: b.longitude }) : null }))
    if (user) list.sort((a, b) => a.d! - b.d!)
    return list
  }, [branches, user])

  const matches = (b: Branch) => filter === 'all' || (filter === 'men' ? b.hasMen : b.hasWomen)
  const dimmed = useMemo(() => new Set(branches.filter((b) => !matches(b)).map((b) => b.slug)), [branches, filter]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = ranked.filter(({ b }) => matches(b))

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', message: 'مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند. شعبه را از روی نقشه انتخاب کنید.' })
      return
    }
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // موقعیت فقط در حافظهٔ همین صفحه می‌ماند و به سرور ارسال نمی‌شود
        const u = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUser(u)
        setVisibleCount(branches.length)
        const candidates = branches.filter(matches)
        const nearest = candidates.reduce<{ b: Branch; d: number } | null>((best, b) => {
          const d = distanceKm(u, { lat: b.latitude, lng: b.longitude })
          return !best || d < best.d ? { b, d } : best
        }, null)
        if (nearest) setActive(nearest.b.slug)
        setGeo({ status: 'done', far: !!nearest && nearest.d > 60 })
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      },
      (err) => setGeo({
        status: 'error',
        message: err.code === err.PERMISSION_DENIED
          ? 'اجازهٔ دسترسی به موقعیت داده نشد. می‌توانید از تنظیمات مرورگر اجازه دهید یا شعبه را از روی نقشه انتخاب کنید.'
          : 'موقعیت شما پیدا نشد. دوباره امتحان کنید یا شعبه را از روی نقشه انتخاب کنید.',
      }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const select = (slug: string) => {
    setActive(slug)
    document.getElementById(`branch-${slug}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <section ref={section} id="branches" aria-labelledby="branches-title" className="relative mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="branches-title" className="section-title">{brand.nearSlogan}</h2>
          <p className="lede mt-4">{faNum(branches.length || 12)} شعبه در {brand.city}. موقعیتت را بده تا نزدیک‌ترین سالن را نشانت بدهیم.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="نوع سالن" className="flex rounded-full border border-steel-2 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${filter === f.key ? 'bg-chalk text-iron' : 'text-rubber hover:text-chalk'}`}
              >{f.label}</button>
            ))}
          </div>
          <button onClick={locate} disabled={geo.status === 'locating'} className="btn-plate disabled:opacity-70">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden><circle cx="12" cy="12" r="3.5" fill="currentColor" /><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" strokeWidth="2" /></svg>
            {geo.status === 'locating' ? 'در حال پیدا کردن…' : 'نزدیک‌ترین شعبه به من'}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {geo.status === 'error' && <p className="text-amber-300">{geo.message}</p>}
        {geo.status === 'done' && (
          <p className="text-plate-hi">
            {geo.far
              ? `به نظر می‌رسد بیرون از ${brand.city} هستید؛ شعبه‌ها بر اساس فاصله مرتب شدند.`
              : 'شعبه‌ها بر اساس فاصله از شما مرتب شدند. نزدیک‌ترین شعبه روی نقشه مشخص است.'}
          </p>
        )}
        {error && <p className="text-amber-300">فهرست شعبه‌ها بارگذاری نشد. صفحه را دوباره بارگذاری کنید.</p>}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <ol ref={listRef} className="order-2 max-h-[640px] space-y-3 overflow-y-auto overscroll-contain pl-1 lg:order-1" data-lenis-prevent>
          {shown.map(({ b, d }, i) => {
            const isActive = active === b.slug
            return (
              <li key={b.slug} id={`branch-${b.slug}`}>
                <article
                  className={`rounded-2xl border p-5 transition-colors ${isActive ? 'border-plate bg-plate/10' : 'border-steel-2 bg-steel hover:border-steel-2/0 hover:bg-steel-2'}`}
                >
                  <button className="block w-full text-right" onClick={() => setActive(b.slug)} aria-pressed={isActive}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black">{b.name}</h3>
                      {d !== null && (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${i === 0 ? 'bg-plate text-white' : 'bg-iron text-rubber'}`}>
                          {i === 0 ? 'نزدیک‌ترین، ' : ''}{formatDistance(d)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-rubber">{b.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {b.hasMen && <span className="rounded-full border border-plate/50 px-2.5 py-1 text-plate-hi">آقایان</span>}
                      {b.hasWomen && <span className="rounded-full border border-women/50 px-2.5 py-1 text-women">بانوان</span>}
                      {!b.addressConfirmed && <span className="rounded-full border border-steel-2 px-2.5 py-1 text-rubber">آدرس دقیق به‌زودی</span>}
                    </div>
                  </button>

                  {isActive && (
                    <div className="mt-4 space-y-3 border-t border-steel-2 pt-4 text-sm">
                      {b.menHours && <p><span className="text-rubber">سانس آقایان: </span>{b.menHours}</p>}
                      {b.womenHours && <p><span className="text-rubber">سانس بانوان: </span>{b.womenHours}</p>}
                      {b.disciplines.length > 0 && <p><span className="text-rubber">رشته‌ها: </span>{b.disciplines.join('، ')}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {b.phone && <a href={`tel:${b.phone}`} className="btn-plate !px-4 !py-2 text-sm">تماس {faDigits(b.phone)}</a>}
                        {routeLinks(b).map((r) => (
                          <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-4 !py-2 text-sm">مسیریابی با {r.label}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </li>
            )
          })}
        </ol>

        <div ref={mapBox} className="relative order-1 h-[420px] overflow-hidden rounded-3xl border border-steel-2 bg-steel lg:order-2 lg:h-[640px]">
          {mapOn && branches.length > 0 && (
            <Suspense fallback={null}>
              <BranchMap branches={branches} visibleCount={visibleCount} activeSlug={active} dimmed={dimmed} user={user} onSelect={select} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  )
}
