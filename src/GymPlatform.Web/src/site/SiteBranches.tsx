import { useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, Phone, Navigation } from 'lucide-react'
import { SectionHead, wrap } from './ui/SectionHead'
import { api, type Branch } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { distanceKm, faDigits, formatDistance } from '@/lib/fa'
import { fill, fillCount, site } from '@/lib/site'
import { cn } from '@/lib/utils'

import CityBranchPicker, { type PickerArea } from '@/components/ui/city-branch-picker'

const AREA_COLORS = ['#2C2C2C', 'var(--color-plate)', 'var(--color-sun)', '#8A8A8A']
const AREA_NAMES: Record<string, string> = { nw: 'شمال‌غرب', ne: 'شمال‌شرق', sw: 'جنوب‌غرب', se: 'جنوب‌شرق' }
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

/** طرح ساده‌شدهٔ مرز ایران [عرض، طول] — شماتیک، نه نقشهٔ رسمی؛ وقتی شعبه‌ها در چند شهر پخش‌اند */
const IRAN_OUTLINE: [number, number][] = [
  [39.78, 44.6], [39.0, 44.3], [38.3, 44.3], [37.1, 44.8], [36.6, 45.0], [35.8, 46.0], [35.1, 46.2], [34.5, 45.6],
  [33.7, 45.9], [33.0, 46.2], [32.0, 47.6], [31.0, 47.7], [30.0, 48.0], [29.9, 48.6], [29.0, 50.6], [27.8, 51.5],
  [27.4, 52.6], [26.6, 54.6], [26.8, 55.6], [27.1, 56.3], [26.0, 57.2], [25.6, 57.8], [25.3, 59.5], [25.2, 61.6],
  [26.2, 61.9], [26.6, 63.2], [27.2, 62.8], [28.3, 62.0], [29.4, 60.9], [29.9, 60.9], [31.0, 61.8], [31.4, 60.9],
  [33.5, 60.6], [34.6, 61.0], [35.6, 61.3], [36.6, 61.2], [37.3, 60.0], [37.6, 59.0], [38.2, 57.3], [37.9, 55.5],
  [37.3, 54.0], [36.8, 53.9], [36.7, 52.5], [36.9, 50.6], [37.5, 49.5], [38.4, 48.9], [39.4, 48.3], [39.7, 47.9],
  [39.15, 47.0], [38.9, 46.5], [39.0, 45.6], [39.65, 44.8],
]
const isNationwide = (lats: number[], lngs: number[]) => Math.max(...lats) - Math.min(...lats) > 2 || Math.max(...lngs) - Math.min(...lngs) > 2

/** هر شهری: منطقه‌ها چهار ربع اطراف میانهٔ شعبه‌ها، و طرح شهر پوستهٔ محدب شعبه‌ها با کمی حاشیه (شماتیک، نه نقشهٔ رسمی) */
function cityLayout(branches: Branch[]) {
  const lat0 = median(branches.map((b) => b.latitude)), lng0 = median(branches.map((b) => b.longitude))
  const areaOf = (b: Branch) => (b.latitude >= lat0 ? 'n' : 's') + (b.longitude <= lng0 ? 'w' : 'e')
  const groups = new Map<string, Branch[]>()
  branches.forEach((b) => groups.set(areaOf(b), [...(groups.get(areaOf(b)) ?? []), b]))
  const areas: PickerArea[] = [...groups.entries()].map(([id, list], k) => ({
    id, name: AREA_NAMES[id], color: AREA_COLORS[k % AREA_COLORS.length],
    sub: [...new Set(list.map((b) => b.district))].slice(0, 3).join('، '),
  }))
  // طرح شهر: بیضی کمی موج‌دار دور همهٔ شعبه‌ها (هر شعبه داخلش می‌افتد؛ با یک شعبهٔ دور هم تیز نمی‌شود)
  const lats = branches.map((b) => b.latitude), lngs = branches.map((b) => b.longitude)
  // شعبه‌ها در چند شهر: همان نقشهٔ شماتیک، ولی روی طرح کل ایران
  if (isNationwide(lats, lngs)) return { areas, areaOf, outline: IRAN_OUTLINE }
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2, cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const rLat = Math.max(0.01, (Math.max(...lats) - Math.min(...lats)) / 2) * 1.3 + 0.008
  const rLng = Math.max(0.01, (Math.max(...lngs) - Math.min(...lngs)) / 2) * 1.3 + 0.008
  const outline = Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2, w = 1 + 0.05 * Math.sin(3 * t + 1) + 0.035 * Math.cos(5 * t)
    return [cLat + Math.sin(t) * rLat * w, cLng + Math.cos(t) * rLng * w] as [number, number]
  })
  return { areas, areaOf, outline: outline.length >= 3 ? outline : null }
}

type Filter = 'all' | 'men' | 'women'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'همه' }, { key: 'men', label: 'آقایان' }, { key: 'women', label: 'بانوان' },
]
const routes = (b: Branch) => [
  { label: 'نشان', href: `https://neshan.org/maps/@${b.latitude},${b.longitude},16z,0p` },
  { label: 'بلد', href: `https://balad.ir/location?latitude=${b.latitude}&longitude=${b.longitude}&zoom=16` },
  { label: 'گوگل‌مپ', href: `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}` },
]

/** «هرکجا هستی، یک سالن نزدیکته» — نقشهٔ شماتیک شهر + فهرست شعبه‌ها (کمتر از سه شعبه یا نقشهٔ خاموش: فهرست ساده) */
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
  const nearest = user ? ranked.find(({ b }) => matches(b))?.b.slug ?? null : null

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

  // دکمهٔ «نزدیک‌ترین شعبه» در هیرو همین تابع را صدا می‌زند
  const locateRef = useRef(locate)
  locateRef.current = locate
  useEffect(() => {
    const f = () => locateRef.current()
    window.addEventListener('kg:locate', f)
    return () => window.removeEventListener('kg:locate', f)
  }, [])

  const layout = useMemo(() => (branches.length >= 3 && site.modules.cityMap ? cityLayout(branches) : null), [branches])
  const sec = site.home.branches
  return (
    <section id="branches" aria-labelledby="branches-title" className="relative bg-steel py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
      <SectionHead
        id="branches-title"
        eyebrow={fillCount(sec.eyebrow)}
        title={fill(sec.title) || fill(brand.nearSlogan) || 'شعبه‌ها'}
        body={`${fill(sec.text)} موقعیت فقط در مرورگر خودت می‌ماند.`.trim()}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={locate} disabled={geo.status === 'locating'}
              className="inline-flex h-[52px] cursor-pointer items-center gap-2.5 rounded-[3px] bg-plate px-7 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-plate-hi disabled:opacity-60">
              <LocateFixed className="size-4" aria-hidden />
              {geo.status === 'locating' ? 'در حال پیدا کردن…' : 'نزدیک‌ترین شعبه به من'}
            </button>
            <div role="radiogroup" aria-label="نوع سالن" className="flex rounded-[3px] border-2 border-chalk/15 bg-white p-1">
              {FILTERS.map((f) => (
                <button key={f.key} role="radio" aria-checked={filter === f.key} onClick={() => setFilter(f.key)}
                  className={cn('h-10 min-w-11 cursor-pointer rounded-[2px] px-4 text-sm font-bold transition-colors duration-200', filter === f.key ? 'bg-chalk text-white' : 'text-rubber hover:text-chalk')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div aria-live="polite" className="mt-6 min-h-6 text-sm">
        {geo.msg && <p className={geo.status === 'error' ? 'text-danger' : 'text-plate'}>{geo.msg}</p>}
        {error && <p className="text-danger">فهرست شعبه‌ها بارگذاری نشد. صفحه را دوباره بارگذاری کنید.</p>}
      </div>

      <div className="mt-4">
        {layout?.outline ? <CityBranchPicker
          branches={branches}
          areas={layout.areas}
          areaOf={layout.areaOf}
          outline={layout.outline}
          cityName={brand.city}
          selected={active}
          onSelect={setActive}
          dimmed={dimmed}
          user={user}
          distanceOf={(b) => (user ? distanceKm(user, { lat: b.latitude, lng: b.longitude }) : null)}
          nearestSlug={nearest}
          formatDistance={formatDistance}
          renderDetails={(b) => b ? <BranchDetails b={b} /> : (
            <p className="text-[14px] text-rubber">یک منطقه را روی نقشه باز کن و شعبه را انتخاب کن؛ ساعت سانس‌ها، تلفن و مسیریابی همین‌جا می‌آید.</p>
          )}
        /> : <BranchList ranked={ranked.filter(({ b }) => matches(b))} active={active} onSelect={setActive} nearest={nearest} />}
      </div>
      </div>
    </section>
  )
}

/** فهرست ساده (بدون نقشه): کارت هر شعبه، با کلیک جزئیات باز می‌شود */
function BranchList({ ranked, active, onSelect, nearest }: { ranked: { b: Branch; d: number | null }[]; active: string | null; onSelect: (s: string | null) => void; nearest: string | null }) {
  if (ranked.length === 0) return <p className="rounded-[3px] bg-white p-6 text-center text-[15px] text-rubber">به‌زودی شعبه‌ها این‌جا معرفی می‌شوند.</p>
  return (
    <ul className="grid gap-3">
      {ranked.map(({ b, d }) => (
        <li key={b.slug} className={cn('rounded-[3px] border-2 bg-white transition-colors', active === b.slug ? 'border-plate' : 'border-transparent')}>
          <button type="button" onClick={() => onSelect(active === b.slug ? null : b.slug)} aria-expanded={active === b.slug}
            className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-start">
            <span><span className="block text-[17px] font-bold text-chalk">{b.name}</span><span className="text-[14px] text-rubber">{b.district}</span></span>
            <span className="shrink-0 text-[13px] font-bold text-plate">{nearest === b.slug ? 'نزدیک‌ترین' : d != null ? formatDistance(d) : ''}</span>
          </button>
          {active === b.slug && <div className="border-t border-steel-2 p-5"><BranchDetails b={b} /></div>}
        </li>
      ))}
    </ul>
  )
}

/** جزئیات شعبهٔ انتخاب‌شده در پایین کارت نقشه */
function BranchDetails({ b }: { b: Branch }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-chalk">{b.name}</p>
        <p className="mt-1 text-[14px] text-rubber">{b.address}{!b.addressConfirmed && ' — آدرس دقیق به‌زودی'}</p>
        <div className="mt-3 grid gap-1 text-[14px]">
          {b.menHours && <p><span className="text-rubber">سانس آقایان: </span>{faDigits(b.menHours)}</p>}
          {b.womenHours && <p><span className="text-rubber">سانس بانوان: </span>{faDigits(b.womenHours)}</p>}
          {b.disciplines.length > 0 && <p><span className="text-rubber">رشته‌ها: </span>{b.disciplines.join('، ')}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {b.phone && <a href={`tel:${b.phone}`} className="inline-flex h-11 items-center gap-2 rounded-[3px] bg-plate px-4 font-bold text-white transition-colors hover:bg-plate-hi"><Phone className="size-4" aria-hidden /><span dir="ltr">{faDigits(b.phone)}</span></a>}
        {routes(b).map((r) => (
          <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[3px] border-2 border-chalk/15 bg-white px-4 font-bold transition-colors hover:border-chalk"><Navigation className="size-4" aria-hidden />{r.label}</a>
        ))}
      </div>
    </div>
  )
}
