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
const AREA_NAMES: Record<string, string> = { nw: 'Nordwest', ne: 'Nordost', sw: 'Südwest', se: 'Südost' }
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

/** Vereinfachter Umriss Deutschlands [Breite, Länge] — schematisch, keine amtliche Karte; wenn Filialen auf mehrere Städte verteilt sind */
const GERMANY_OUTLINE: [number, number][] = [
  [54.9, 8.6], [54.8, 9.9], [54.4, 11.0], [54.2, 12.4], [54.6, 13.4], [53.9, 14.2], [53.3, 14.4], [52.6, 14.6],
  [51.8, 14.7], [51.0, 15.0], [50.8, 14.3], [50.3, 12.3], [49.9, 12.5], [49.4, 12.9], [48.8, 13.8], [48.4, 13.4],
  [47.7, 13.0], [47.5, 12.2], [47.6, 10.5], [47.5, 9.6], [47.7, 8.6], [47.6, 7.6], [48.1, 7.6], [49.0, 8.2],
  [49.2, 6.6], [49.6, 6.4], [50.1, 6.1], [50.8, 6.0], [51.4, 6.2], [51.9, 6.8], [52.3, 7.0], [53.2, 7.2],
  [53.6, 7.0], [53.7, 8.0], [54.1, 8.8],
]
const isNationwide = (lats: number[], lngs: number[]) => Math.max(...lats) - Math.min(...lats) > 2 || Math.max(...lngs) - Math.min(...lngs) > 2

/** Jede Stadt: Gebiete sind vier Viertel um die Mitte der Filialen, der Stadtumriss ist die konvexe Hülle der Filialen mit etwas Rand (schematisch, keine amtliche Karte) */
function cityLayout(branches: Branch[]) {
  const lat0 = median(branches.map((b) => b.latitude)), lng0 = median(branches.map((b) => b.longitude))
  const areaOf = (b: Branch) => (b.latitude >= lat0 ? 'n' : 's') + (b.longitude <= lng0 ? 'w' : 'e')
  const groups = new Map<string, Branch[]>()
  branches.forEach((b) => groups.set(areaOf(b), [...(groups.get(areaOf(b)) ?? []), b]))
  const areas: PickerArea[] = [...groups.entries()].map(([id, list], k) => ({
    id, name: AREA_NAMES[id], color: AREA_COLORS[k % AREA_COLORS.length],
    sub: [...new Set(list.map((b) => b.district))].slice(0, 3).join(', '),
  }))
  // Stadtumriss: leicht gewellte Ellipse um alle Filialen (jede Filiale liegt innen; eine weit entfernte macht ihn nicht spitz)
  const lats = branches.map((b) => b.latitude), lngs = branches.map((b) => b.longitude)
  // Filialen in mehreren Städten: dieselbe schematische Karte, aber auf dem Umriss Deutschlands
  if (isNationwide(lats, lngs)) return { areas, areaOf, outline: GERMANY_OUTLINE }
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
  { key: 'all', label: 'Alle' }, { key: 'men', label: 'Herren' }, { key: 'women', label: 'Damen' },
]
const routes = (b: Branch) => [
  { label: 'Apple Karten', href: `https://maps.apple.com/?daddr=${b.latitude},${b.longitude}` },
  { label: 'OpenStreetMap', href: `https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=16/${b.latitude}/${b.longitude}` },
  { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}` },
]

/** „Wo du auch bist, ein Studio ist in deiner Nähe“ — schematische Stadtkarte + Filialliste (unter drei Filialen oder Karte aus: einfache Liste) */
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
    if (!('geolocation' in navigator)) return setGeo({ status: 'error', msg: 'Ihr Browser unterstützt keine Standortbestimmung. Bitte die Filiale auf der Karte wählen.' })
    setGeo({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const u = { lat: p.coords.latitude, lng: p.coords.longitude } // Nur im Browser; wird nicht an den Server gesendet
        setUser(u)
        const near = branches.filter(matches).map((b) => ({ b, d: distanceKm(u, { lat: b.latitude, lng: b.longitude }) })).sort((a, b) => a.d - b.d)[0]
        if (near) setActive(near.b.slug)
        setGeo({ status: 'done', msg: near && near.d > 60 ? `Du scheinst außerhalb von ${brand.city} zu sein; die Filialen sind nach Entfernung sortiert.` : 'Die Filialen sind nach Entfernung zu dir sortiert.' })
      },
      (err) => setGeo({ status: 'error', msg: err.code === err.PERMISSION_DENIED ? 'Standortfreigabe verweigert. Bitte in den Browsereinstellungen erlauben oder die Filiale auf der Karte wählen.' : 'Standort nicht gefunden. Bitte erneut versuchen.' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  // Der Button „Nächstes Studio“ im Hero ruft dieselbe Funktion auf
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
        title={fill(sec.title) || fill(brand.nearSlogan) || 'Filialen'}
        body={`${fill(sec.text)} Dein Standort bleibt nur in deinem Browser.`.trim()}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={locate} disabled={geo.status === 'locating'}
              className="inline-flex h-[52px] cursor-pointer items-center gap-2.5 rounded-[3px] bg-plate px-7 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-plate-hi disabled:opacity-60">
              <LocateFixed className="size-4" aria-hidden />
              {geo.status === 'locating' ? 'Wird gesucht…' : 'Nächstes Studio finden'}
            </button>
            <div role="radiogroup" aria-label="Bereich" className="flex rounded-[3px] border-2 border-chalk/15 bg-white p-1">
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
        {error && <p className="text-danger">Filialliste konnte nicht geladen werden. Bitte die Seite neu laden.</p>}
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
            <p className="text-[14px] text-rubber">Öffne ein Gebiet auf der Karte und wähle eine Filiale; Öffnungszeiten, Telefon und Route erscheinen hier.</p>
          )}
        /> : <BranchList ranked={ranked.filter(({ b }) => matches(b))} active={active} onSelect={setActive} nearest={nearest} />}
      </div>
      </div>
    </section>
  )
}

/** Einfache Liste (ohne Karte): Karte je Filiale, Details per Klick */
function BranchList({ ranked, active, onSelect, nearest }: { ranked: { b: Branch; d: number | null }[]; active: string | null; onSelect: (s: string | null) => void; nearest: string | null }) {
  if (ranked.length === 0) return <p className="rounded-[3px] bg-white p-6 text-center text-[15px] text-rubber">Bald stellen wir hier unsere Filialen vor.</p>
  return (
    <ul className="grid gap-3">
      {ranked.map(({ b, d }) => (
        <li key={b.slug} className={cn('rounded-[3px] border-2 bg-white transition-colors', active === b.slug ? 'border-plate' : 'border-transparent')}>
          <button type="button" onClick={() => onSelect(active === b.slug ? null : b.slug)} aria-expanded={active === b.slug}
            className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-start">
            <span><span className="block text-[17px] font-bold text-chalk">{b.name}</span><span className="text-[14px] text-rubber">{b.district}</span></span>
            <span className="shrink-0 text-[13px] font-bold text-plate">{nearest === b.slug ? 'Am nächsten' : d != null ? formatDistance(d) : ''}</span>
          </button>
          {active === b.slug && <div className="border-t border-steel-2 p-5"><BranchDetails b={b} /></div>}
        </li>
      ))}
    </ul>
  )
}

/** Details der gewählten Filiale unten in der Kartenansicht */
function BranchDetails({ b }: { b: Branch }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-chalk">{b.name}</p>
        <p className="mt-1 text-[14px] text-rubber">{b.address}{!b.addressConfirmed && ' — genaue Adresse folgt'}</p>
        <div className="mt-3 grid gap-1 text-[14px]">
          {b.menHours && <p><span className="text-rubber">Herren: </span>{faDigits(b.menHours)}</p>}
          {b.womenHours && <p><span className="text-rubber">Damen: </span>{faDigits(b.womenHours)}</p>}
          {b.disciplines.length > 0 && <p><span className="text-rubber">Angebote: </span>{b.disciplines.join(', ')}</p>}
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
