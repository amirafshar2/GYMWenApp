import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Branch } from '../lib/api'

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const SHIRAZ: [number, number] = [52.505, 29.645]

interface Props {
  branches: Branch[]
  visibleCount: number
  activeSlug: string | null
  dimmed: Set<string>
  user: { lat: number; lng: number } | null
  onSelect: (slug: string) => void
}

/**
 * نقشهٔ تیرهٔ MapLibre (کاشی‌های CARTO dark-matter، بدون کلید API).
 * این کامپوننت فقط وقتی بخش نقشه وارد دید شد import می‌شود.
 * اگر کاشی‌ها بارگذاری نشوند (مثلاً محدودیت اینترنت)، نقشهٔ شماتیک SVG نمایش داده می‌شود.
 */
export default function BranchMap({ branches, visibleCount, activeSlug, dimmed, user, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLElement }>())
  const userMarker = useRef<Marker | null>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer = 0
    import('maplibre-gl').then((maplibregl) => {
      if (cancelled || !box.current) return
      maplibregl.setWorkerUrl(workerUrl)
      const m = new maplibregl.Map({
        container: box.current,
        style: STYLE,
        center: SHIRAZ,
        zoom: 11.2,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'برای زوم، Ctrl را نگه دارید و اسکرول کنید',
          'CooperativeGesturesHandler.MacHelpText': 'برای زوم، ⌘ را نگه دارید و اسکرول کنید',
          'CooperativeGesturesHandler.MobileHelpText': 'برای جابه‌جایی نقشه از دو انگشت استفاده کنید',
          'NavigationControl.ZoomIn': 'بزرگ‌نمایی',
          'NavigationControl.ZoomOut': 'کوچک‌نمایی',
        },
      })
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
      map.current = m
      timer = window.setTimeout(() => { if (!m.loaded()) setFailed(true) }, 8000)
      m.on('load', () => { clearTimeout(timer); setReady(true) })
      m.on('error', (e: { error?: { message?: string } }) => { if (!m.loaded() && String(e.error?.message ?? '').match(/fetch|load|style/i)) setFailed(true) })

      for (const b of branches) {
        const el = document.createElement('button')
        el.className = 'plate-pin'
        el.type = 'button'
        el.setAttribute('aria-label', b.name)
        el.style.opacity = '0'
        el.addEventListener('click', () => onSelect(b.slug))
        const marker = new maplibregl.Marker({ element: el }).setLngLat([b.longitude, b.latitude]).addTo(m)
        markers.current.set(b.slug, { marker, el })
      }
    }).catch(() => setFailed(true))

    return () => {
      cancelled = true
      clearTimeout(timer)
      map.current?.remove()
      map.current = null
      markers.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ظاهر شدن پین‌ها یکی‌یکی با اسکرول
  useEffect(() => {
    branches.forEach((b, i) => {
      const m = markers.current.get(b.slug)
      if (!m) return
      m.el.style.transition = 'opacity .5s, transform .25s'
      m.el.style.opacity = i < visibleCount ? '1' : '0'
      m.el.dataset.active = String(b.slug === activeSlug)
      m.el.dataset.dim = String(dimmed.has(b.slug))
    })
  }, [branches, visibleCount, activeSlug, dimmed, ready])

  useEffect(() => {
    const b = branches.find((x) => x.slug === activeSlug)
    if (b && map.current) map.current.flyTo({ center: [b.longitude, b.latitude], zoom: 14, speed: 1.2, essential: true })
  }, [activeSlug, branches])

  useEffect(() => {
    if (!map.current || !user) return
    import('maplibre-gl').then((maplibregl) => {
      userMarker.current?.remove()
      const el = document.createElement('div')
      el.className = 'you-pin'
      el.setAttribute('aria-label', 'موقعیت شما')
      userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([user.lng, user.lat]).addTo(map.current!)
    })
  }, [user])

  return (
    <div className="relative size-full">
      <div ref={box} className="absolute inset-0" />
      {failed && <SchematicMap branches={branches} visibleCount={visibleCount} activeSlug={activeSlug} dimmed={dimmed} user={user} onSelect={onSelect} />}
    </div>
  )
}

/** نقشهٔ شماتیک جایگزین وقتی کاشی‌های نقشه در دسترس نیستند */
function SchematicMap({ branches, visibleCount, activeSlug, dimmed, user, onSelect }: Omit<Props, never>) {
  const lats = branches.map((b) => b.latitude).concat(user ? [user.lat] : [])
  const lngs = branches.map((b) => b.longitude).concat(user ? [user.lng] : [])
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const pad = 0.12
  const x = (lng: number) => pad * 100 + ((lng - minLng) / (maxLng - minLng || 1)) * (100 - pad * 200)
  const y = (lat: number) => pad * 100 + ((maxLat - lat) / (maxLat - minLat || 1)) * (100 - pad * 200)
  return (
    <div className="absolute inset-0 bg-steel">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full opacity-40" aria-hidden>
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i} stroke="#1b2129" strokeWidth="0.2">
            <line x1={i * 10} y1="0" x2={i * 10} y2="100" />
            <line x1="0" y1={i * 10} x2="100" y2={i * 10} />
          </g>
        ))}
      </svg>
      {branches.map((b, i) => (
        <button
          key={b.slug}
          type="button"
          aria-label={b.name}
          className="plate-pin absolute -translate-x-1/2 -translate-y-1/2"
          data-active={b.slug === activeSlug}
          data-dim={dimmed.has(b.slug)}
          style={{ left: `${x(b.longitude)}%`, top: `${y(b.latitude)}%`, opacity: i < visibleCount ? 1 : 0, transition: 'opacity .5s' }}
          onClick={() => onSelect(b.slug)}
        />
      ))}
      {user && <div className="you-pin absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x(user.lng)}%`, top: `${y(user.lat)}%` }} />}
      <p className="absolute bottom-3 right-3 rounded-full bg-iron/80 px-3 py-1 text-xs text-rubber">نمای شماتیک — نقشه در دسترس نیست</p>
    </div>
  )
}
