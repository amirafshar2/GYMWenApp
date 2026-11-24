// Formatierung für die deutsche Version (Dateiname aus der ursprünglichen persischen Version beibehalten)
const nf = new Intl.NumberFormat('de-DE')
const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

/** Zahl mit Tausendertrennzeichen */
export const faNum = (n: number) => nf.format(n)

/** Betrag in Cent → „2.600,00 €“ */
export const toman = (cents: number) => eur.format(cents / 100)

/** Kurzer Preis für große Anzeige: { value: "49", unit: "€" } */
export function tomanShort(cents: number): { value: string; unit: string } {
  const e = cents / 100
  return { value: new Intl.NumberFormat('de-DE', { maximumFractionDigits: e % 1 ? 2 : 0, minimumFractionDigits: e % 1 ? 2 : 0 }).format(e), unit: '€' }
}

/** Datum (deutsches Format, Berliner Zeit) */
export const jalali = (d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', ...opts }).format(typeof d === 'string' ? new Date(d) : d)

/** Früher: lateinische Ziffern in persische umwandeln — jetzt unverändert */
export const faDigits = (s: string) => s

/** Entfernung nach der Haversine-Formel (km) — nur clientseitig, der Standort wird nirgends gespeichert */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const formatDistance = (km: number) =>
  km < 1 ? `${faNum(Math.round(km * 1000 / 50) * 50)} m` : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(km)} km`

/** Cent → Eingabetext in Euro („49,90“) */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')

/** Euro-Eingabe („49,90“, „49.90“, „1.299“) → Cent; NaN bei ungültiger Eingabe */
export function euroToCents(s: string): number {
  let t = s.replace(/[\s€]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, '')
  if (t === '') return NaN
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}
