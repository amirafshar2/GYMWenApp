import { useSyncExternalStore } from 'react'
import { brand } from './brand'
import { faNum, faDigits } from './fa'

/**
 * Seiteneinstellungen, die der Inhaber im Panel („Website-Einstellungen“) ändert: Name und Logo, Farben, Kontakt, Texte und Bilder der Bereiche, Module.
 * Wird vor dem ersten Rendern aus /api/v1/site gelesen (vorherige Version aus dem Browserspeicher, damit die Seite nicht wartet)
 * und überall per site.home.… oder fill(…) verwendet.
 */
export interface CardItem { title: string; text?: string | null; imageUrl?: string | null; icon?: string | null; href?: string | null }
export interface SimpleSection { eyebrow: string; title: string; text: string }
export interface SectionToggle { key: SectionKey; enabled: boolean }
export type SectionKey = 'intro' | 'why' | 'video' | 'offer' | 'branches' | 'pricing' | 'shop' | 'events' | 'gallery' | 'coaches' | 'faq' | 'contact'

export interface SiteConfig {
  brand: {
    name: string; shortName: string; latinName: string; slogan: string; nearSlogan: string; whySlogan: string
    city: string; description: string; logoUrl?: string | null; logoFullUrl?: string | null
  }
  contact: {
    phone: string; email?: string | null; address?: string | null; instagram?: string | null; telegram?: string | null
    whatsApp?: string | null; responseTime?: string | null; enamadId?: string | null; enamadCode?: string | null
  }
  theme: { primary: string; accent: string; dark: string }
  home: {
    sections: SectionToggle[]
    hero: { eyebrow: string; body: string; primaryCta: string; secondaryCta: string; imageUrl: string; mobileImageUrl: string }
    intro: { eyebrow: string; title: string; cards: CardItem[] }
    why: { title: string; text: string; imageUrl: string; imageCta: string; points: CardItem[]; foundedYear?: number | null; members?: number | null }
    video: { title: string; videoUrl?: string | null; posterUrl: string; mobilePosterUrl?: string | null; mode?: 'scrub' | 'loop'; optimized?: boolean }
    offer: { eyebrow: string; title: string; items: CardItem[] }
    branches: SimpleSection; pricing: SimpleSection; shop: SimpleSection
    events: { eyebrow: string; title: string; text: string; imageUrl: string; secondImageUrl: string }
    gallery: { title: string; images: CardItem[] }
    coaches: SimpleSection; faq: SimpleSection; contact: SimpleSection
    footerNote: string
  }
  legal: { about: string; terms: string; privacy: string; refund: string }
  modules: { shop: boolean; canteen: boolean; wallet: boolean; festival: boolean; coaches: boolean; consultation: boolean; cityMap: boolean }
}

export interface SiteInfo extends SiteConfig {
  demo: boolean
  published: boolean
  mode: 'Blank' | 'Demo' | 'Content'
  branches: number
}

const KEY = 'site-config-v1'
let current: SiteInfo | null = null
let version = 0
const listeners = new Set<() => void>()

export const site = new Proxy({} as SiteInfo, { get: (_, k) => (current as unknown as Record<string | symbol, unknown> | null)?.[k] })

/** Hellt eine Farbe #RRGGBB auf/dunkelt sie ab (positives amount = heller) */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => {
    const c = (n >> s) & 255
    return Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
  }
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

function apply(s: SiteInfo) {
  current = s
  version++
  // Marke (Name, Logo, Kontakt) — dasselbe Objekt, aus dem alle Teile lesen
  Object.assign(brand, {
    name: s.brand.name || s.brand.shortName || 'Studio',
    shortName: s.brand.shortName || s.brand.name || 'Studio',
    latinName: s.brand.latinName || '',
    logo: s.brand.logoUrl || '/brand/placeholder-logo.svg',
    logoFull: s.brand.logoFullUrl || s.brand.logoUrl || '/brand/placeholder-logo.svg',
    slogan: s.brand.slogan, nearSlogan: s.brand.nearSlogan, whySlogan: s.brand.whySlogan,
    phone: s.contact.phone, instagram: s.contact.instagram || undefined, city: s.brand.city,
    enamad: s.contact.enamadId && s.contact.enamadCode ? { id: s.contact.enamadId, code: s.contact.enamadCode } : undefined,
  })
  const root = document.documentElement.style
  const t = s.theme
  if (/^#[0-9a-f]{6}$/i.test(t.primary)) {
    root.setProperty('--color-plate', t.primary)
    root.setProperty('--color-plate-hi', shade(t.primary, -0.18))
    root.setProperty('--color-plate-lt', shade(t.primary, 0.35))
    root.setProperty('--color-primary', t.primary)
    root.setProperty('--color-ring', t.primary)
  }
  if (/^#[0-9a-f]{6}$/i.test(t.accent)) root.setProperty('--color-sun', t.accent)
  if (/^#[0-9a-f]{6}$/i.test(t.dark)) root.setProperty('--color-night', t.dark)
  if (s.brand.name) {
    document.title = `${s.brand.name}${s.brand.city ? ` | ${s.brand.city}` : ''}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', s.brand.description || s.brand.name)
  }
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon && s.brand.logoUrl) icon.href = s.brand.logoUrl
  listeners.forEach((l) => l())
}

async function fetchSite(): Promise<SiteInfo> {
  const r = await fetch('/api/v1/site', { headers: { 'X-KG-Client': 'web' }, credentials: 'same-origin' })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** Vor dem ersten Rendern: gespeicherte Version sofort, neue vom Server (bei Unterschied wird die Seite aktualisiert) */
export async function loadSite(): Promise<void> {
  let cached: SiteInfo | null = null
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { /* unwichtig */ }
  const fresh = fetchSite().then((s) => {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* privater Modus */ }
    if (JSON.stringify(s) !== JSON.stringify(current)) apply(s)
    return s
  })
  if (cached?.home?.sections) { apply(cached); fresh.catch(() => {}); return }
  try { await fresh } catch {
    // Server nicht erreichbar: mit leeren Werten starten, damit die Fehlerseite sichtbar wird
    apply(EMPTY)
  }
}

/** Nach dem Speichern im Panel: neue Einstellungen sofort auf der Seite */
export async function reloadSite() {
  const s = await fetchSite()
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* privater Modus */ }
  apply(s)
}

/** Bei jeder Änderung der Einstellungen werden aufrufende Komponenten neu gezeichnet */
export function useSiteVersion() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => version)
}

/** Ersetzung von {name} {short} {city} {branches} {phone} in den Einstellungstexten */
export function fill(text: string | null | undefined): string {
  if (!text) return ''
  const s = current
  return text
    .replaceAll('{name}', brand.name)
    .replaceAll('{short}', brand.shortName)
    .replaceAll('{city}', brand.city || 'Stadt')
    .replaceAll('{branches}', faNum(s?.branches ?? 0))
    .replaceAll('{phone}', faDigits(brand.phone || ''))
}

/** Labels wie „{branches} Filialen in {city}“ werden erst angezeigt, wenn eine Filiale angelegt ist */
export const fillCount = (text: string | null | undefined) => (text?.includes('{branches}') && !current?.branches ? '' : fill(text))

export const sectionOn = (k: SectionKey) => current?.home.sections.find((s) => s.key === k)?.enabled ?? true

const EMPTY: SiteInfo = {
  demo: false, published: true, mode: 'Content', branches: 0,
  brand: { name: '', shortName: '', latinName: '', slogan: '', nearSlogan: '', whySlogan: '', city: '', description: '' },
  contact: { phone: '' },
  theme: { primary: '#0B5FB0', accent: '#FFB400', dark: '#181818' },
  home: {
    sections: [],
    hero: { eyebrow: '', body: '', primaryCta: 'Filialen', secondaryCta: 'Pakete', imageUrl: '/media/hero/dumbbell.webp', mobileImageUrl: '/media/hero/dumbbell-mobile.webp' },
    intro: { eyebrow: '', title: '', cards: [] },
    why: { title: '', text: '', imageUrl: '', imageCta: '', points: [] },
    video: { title: '', posterUrl: '' },
    offer: { eyebrow: '', title: '', items: [] },
    branches: { eyebrow: '', title: '', text: '' }, pricing: { eyebrow: '', title: '', text: '' }, shop: { eyebrow: '', title: '', text: '' },
    events: { eyebrow: '', title: '', text: '', imageUrl: '', secondImageUrl: '' },
    gallery: { title: '', images: [] },
    coaches: { eyebrow: '', title: '', text: '' }, faq: { eyebrow: '', title: '', text: '' }, contact: { eyebrow: '', title: '', text: '' },
    footerNote: '',
  },
  legal: { about: '', terms: '', privacy: '', refund: '' },
  modules: { shop: true, canteen: true, wallet: true, festival: true, coaches: true, consultation: true, cityMap: true },
}

/** „Überschrift; farbiger Teil“ → [Überschrift, Rest] (ohne „;“ ist der Rest leer) */
export function splitAccent(text: string): [string, string] {
  const [a, ...b] = fill(text).split(';')
  return [a.trim(), b.join(';').trim()]
}
