import { useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, Phone, Navigation } from 'lucide-react'
import { SectionHead, wrap } from './ui/SectionHead'
import { api, type Branch } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { distanceKm, faDigits, faNum, formatDistance } from '@/lib/fa'
import { cn } from '@/lib/utils'

import CityBranchPicker, { type PickerArea } from '@/components/ui/city-branch-picker'

/** چهار منطقهٔ شهر با رنگ‌های تم سایت */
const DEMO = brand.key === 'demo'
const AREAS: PickerArea[] = [
  { id: 'nw', name: 'شمال‌غرب', sub: DEMO ? 'محله‌های شمالی' : 'شهرک گلستان', color: '#2C2C2C' },
  { id: 'w', name: 'غرب', sub: DEMO ? 'محله‌های غربی' : 'معالی‌آباد و قدوسی', color: '#0B5FB0' },
  { id: 'c', name: 'مرکز', sub: DEMO ? 'مرکز شهر' : 'فرهنگ‌شهر، نیایش، سروناز', color: '#FFB400' },
  { id: 'e', name: 'شرق و جنوب', sub: 'شعبه‌های تازه', color: '#8A8A8A' },
]
const areaOf = (b: Branch) =>
  b.latitude > 29.69 ? 'nw' : b.longitude < 52.495 ? 'w' : b.longitude < 52.515 && b.latitude > 29.62 ? 'c' : 'e'

/** طرح کلی شماتیک شیراز [lat, lng] — دره‌ای کشیده از شمال‌غرب به جنوب‌شرق (مرز رسمی شهرداری نیست) */
const SHIRAZ_OUTLINE: [number, number][] = [
  [29.742, 52.418], [29.748, 52.447], [29.722, 52.462], [29.700, 52.478], [29.684, 52.500], [29.672, 52.530],
  [29.660, 52.560], [29.643, 52.585], [29.618, 52.603], [29.590, 52.612], [29.567, 52.596], [29.566, 52.565],
  [29.574, 52.534], [29.582, 52.505], [29.589, 52.478], [29.600, 52.455], [29.618, 52.443], [29.640, 52.444],
  [29.660, 52.440], [29.684, 52.425], [29.708, 52.410], [29.728, 52.406],
]
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

  const [nearSlogan1, nearSlogan2] = brand.nearSlogan.split('،').map((x) => x.trim())
  return (
    <section id="branches" aria-labelledby="branches-title" className="relative bg-steel py-[clamp(80px,9vw,130px)]">
      <div className={wrap}>
      <SectionHead
        id="branches-title"
        eyebrow={`${faNum(branches.length || 12)} شعبه در ${brand.city}`}
        title={`${nearSlogan1}، ${nearSlogan2}`}
        body="موقعیتت را بده تا نزدیک‌ترین سالن را نشانت بدهیم. موقعیت فقط در مرورگر خودت می‌ماند."
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
        <CityBranchPicker
          branches={branches}
          areas={AREAS}
          areaOf={areaOf}
          outline={SHIRAZ_OUTLINE}
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
        />
      </div>
      </div>
    </section>
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
