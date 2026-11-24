import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { panelApi, type AdminCanteenItem, type AdminCoach, type AdminPackage, type AdminProduct, type ImageLibrary, type SaveVariant } from '@/lib/panel'
import type { Branch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { centsToInput, euroToCents } from '@/lib/fa'
import { Btn, inputCls, Notice, toLatinDigits } from '@/member/ui'

const sm = `${inputCls} h-11`
const num = (s: string) => Number(toLatinDigits(s).replace(/[,٬\s]/g, ''))
const optNum = (s: string) => (s.trim() === '' ? null : num(s))
const euro = (s: string) => euroToCents(toLatinDigits(s))
const optEuro = (s: string) => (s.trim() === '' ? null : euro(s))

/** Seitliches Formularfenster (auf dem Handy bildschirmfüllend) */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label="Schließen" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45" />
      <aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-steel-2 px-5 py-4">
          <h2 className="text-[18px] font-black text-chalk">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-steel"><X className="size-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('grid gap-1 text-[13px] font-bold text-chalk', className)}>
      {label}{children}{hint && <span className="text-[12px] font-normal text-rubber">{hint}</span>}
    </label>
  )
}

/** Bildauswahl: Upload (JPG/PNG/WebP bis 2 MB) oder aus vorhandenen Bildern der Seite */
export function ImagePicker({ value, onChange, prefer, hint, wide }: { value: string; onChange: (v: string) => void; prefer: 'canteen' | 'shop' | 'uploads' | 'site'; hint?: string; wide?: boolean }) {
  const [lib, setLib] = useState<ImageLibrary | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open && !lib) panelApi.images().then(setLib).catch((e: Error) => setErr(e.message)) }, [open, lib])

  const upload = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setErr(null)
    try { onChange(await panelApi.uploadImage(f)); setLib(null) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const all = lib ? (prefer === 'uploads' ? lib.uploads : prefer === 'site' ? [...lib.uploads, ...lib.site] : [...lib.uploads, ...(prefer === 'canteen' ? lib.canteen : lib.shop), ...(prefer === 'canteen' ? lib.shop : lib.canteen)]) : []
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className={cn('grid h-20 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-steel-2 bg-steel', wide ? 'w-32' : 'w-20')}>
          {value ? <img src={value} alt="Gewähltes Bild" className={cn('size-full', prefer === 'site' && value.endsWith('.svg') ? 'object-contain p-1' : 'object-cover')} /> : <ImagePlus className="size-6 text-rubber" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn type="button" variant="dark" className="h-10" busy={busy} onClick={() => input.current?.click()}>Bild hochladen</Btn>
          <Btn type="button" variant="ghost" className="h-10" onClick={() => setOpen(!open)}>{open ? 'Schließen' : 'Aus den Bildern der Seite'}</Btn>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Bilddatei"
          onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="text-[12px] text-rubber">{hint ?? 'JPG, PNG oder WebP bis 2 MB. Quadratische Bilder wirken am besten.'}</p>
      {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
      {open && (
        <div className="grid max-h-64 auto-rows-[76px] grid-cols-4 gap-2 overflow-y-auto rounded-[8px] bg-steel p-2 sm:grid-cols-5">
          {!lib ? <Loader2 className="size-5 animate-spin text-rubber" /> : all.map((src) => (
            <button key={src} type="button" onClick={() => { onChange(src); setOpen(false) }} aria-pressed={value === src}
              className={cn('h-full w-full cursor-pointer overflow-hidden rounded-[6px] border-2 bg-white', value === src ? 'border-plate' : 'border-transparent hover:border-steel-2')}>
              <img src={src} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Actions({ busy, onCancel, extra }: { busy: boolean; onCancel: () => void; extra?: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center gap-2 border-t border-steel-2 bg-white px-5 pt-4">
      <Btn type="submit" busy={busy}>Speichern</Btn>
      <Btn type="button" variant="ghost" onClick={onCancel}>Abbrechen</Btn>
      {extra && <span className="ms-auto">{extra}</span>}
    </div>
  )
}

/** Zweistufiges Löschen ohne Bestätigungsdialog des Browsers */
export function DeleteButton({ onDelete, label = 'Löschen' }: { onDelete: () => Promise<void>; label?: string }) {
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!ask) return <button type="button" onClick={() => setAsk(true)} className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-danger hover:underline"><Trash2 className="size-4" aria-hidden />{label}</button>
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      Sicher?
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onDelete() } finally { setBusy(false); setAsk(false) } }} className="cursor-pointer rounded-[3px] bg-danger px-3 py-1.5 font-bold text-white">Ja, löschen</button>
      <button type="button" onClick={() => setAsk(false)} className="cursor-pointer font-bold text-rubber">Nein</button>
    </span>
  )
}

export const errText = (e: unknown) => {
  const x = e as Error & { errors?: Record<string, string[]> }
  const first = x.errors && Object.values(x.errors)[0]?.[0]
  return first ?? x.message
}

// ================================================================ Bistro-Posten
export const CANTEEN_CATS: [string, string][] = [['coffee', 'Kaffee'], ['shake', 'Shakes und Smoothies'], ['drink', 'Getränke'], ['snack', 'Snacks'], ['meal', 'Essen']]

export function CanteenItemForm({ item, onDone, onCancel }: { item: AdminCanteenItem | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: item?.name ?? '', description: item?.description ?? '', category: item?.category ?? 'shake', price: item ? centsToInput(item.priceToman) : '',
    kcal: item?.kcal?.toString() ?? '', protein: item?.proteinG?.toString() ?? '', image: item?.imagePath ?? '', available: item?.isAvailable ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const body = { name: f.name, description: f.description || null, category: f.category, priceToman: euro(f.price), kcal: optNum(f.kcal), proteinG: optNum(f.protein), imagePath: f.image, isAvailable: f.available }
    try { if (item) await panelApi.editCanteenItem(item.id, body); else await panelApi.createCanteenItem(body); onDone() }
    catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <Drawer title={item ? `Bearbeiten: ${item.name}` : 'Neuer Posten auf der Karte'} onClose={onCancel}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Name"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={sm} placeholder="z. B. Shake mit Banane und Erdnussbutter" /></Field>
        <Field label="Kategorie">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={`${sm} cursor-pointer`}>
            {CANTEEN_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Preis (€)" hint="Für alle Filialen gleich."><input required inputMode="numeric" dir="ltr" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={`${sm} text-right`} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kalorien (optional)"><input inputMode="numeric" dir="ltr" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} className={`${sm} text-right`} /></Field>
          <Field label="Protein, Gramm (optional)"><input inputMode="numeric" dir="ltr" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} className={`${sm} text-right`} /></Field>
        </div>
        <Field label="Kurzbeschreibung (optional)"><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
        <div className="grid gap-1 text-[13px] font-bold text-chalk">Bild<ImagePicker value={f.image} onChange={(v) => setF({ ...f, image: v })} prefer="canteen" /></div>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-bold"><input type="checkbox" checked={f.available} onChange={(e) => setF({ ...f, available: e.target.checked })} className="size-4 accent-[var(--color-plate)]" />Jetzt verfügbar</label>
        {err && <Notice tone="err">{err}</Notice>}
        <Actions busy={busy} onCancel={onCancel} extra={item && <DeleteButton label="Von der Karte löschen" onDelete={async () => {
          try { await panelApi.deleteCanteenItem(item.id); onDone() } catch (x) { setErr(errText(x)) }
        }} />} />
      </form>
    </Drawer>
  )
}

// ================================================================ Paket
export const PACKAGE_CATS: [string, string][] = [['Gym', 'Bodybuilding'], ['PersonalTraining', 'Personal Trainer'], ['Nutrition', 'Ernährung'], ['Climbing', 'Klettern'], ['Group', 'Gruppenkurs']]

export function PackageForm({ pkg, onDone, onCancel }: { pkg: AdminPackage | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: pkg?.name ?? '', tagline: pkg?.tagline ?? '', category: pkg?.category ?? 'Gym', months: String(pkg?.durationMonths ?? 1),
    sessions: pkg?.sessions?.toString() ?? '', price: pkg ? centsToInput(pkg.priceToman) : '', features: (pkg?.features ?? []).join('\n'),
    active: pkg?.isActive ?? true, featured: pkg?.isFeatured ?? false,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const body = { name: f.name, tagline: f.tagline || null, category: f.category, durationMonths: num(f.months), sessions: optNum(f.sessions), priceToman: euro(f.price),
      features: f.features.split('\n').map((x) => x.trim()).filter(Boolean), isActive: f.active, isFeatured: f.featured }
    try { if (pkg) await panelApi.editPackage(pkg.id, body); else await panelApi.createPackage(body); onDone() }
    catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <Drawer title={pkg ? `Bearbeiten: ${pkg.name}` : 'Neues Paket'} onClose={onCancel}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Paketname"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={sm} placeholder="z. B. 2 Monate — 24 Einheiten" /></Field>
        <Field label="Kurzer Satz unter dem Namen (optional)"><input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} className={sm} /></Field>
        <Field label="Art">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={`${sm} cursor-pointer`}>
            {PACKAGE_CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Laufzeit (Monate)"><input required inputMode="numeric" dir="ltr" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} className={`${sm} text-right`} /></Field>
          <Field label="Anzahl Einheiten" hint="Leer = unbegrenzt"><input inputMode="numeric" dir="ltr" value={f.sessions} onChange={(e) => setF({ ...f, sessions: e.target.value })} className={`${sm} text-right`} /></Field>
        </div>
        <Field label="Preis (€)" hint="Der Rabatt einer aktiven Aktion wird automatisch abgezogen."><input required inputMode="numeric" dir="ltr" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={`${sm} text-right`} /></Field>
        <Field label="Merkmale (eins pro Zeile)"><textarea rows={4} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} className={`${inputCls} h-auto py-3`} placeholder={'Zugang zu allen Geräten\nErster Trainingsplan'} /></Field>
        <div className="flex flex-wrap gap-5 text-[14px] font-bold">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--color-plate)]" />Verkauf aktiv</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} className="size-4 accent-[var(--color-plate)]" />Besonderes Angebot</label>
        </div>
        {err && <Notice tone="err">{err}</Notice>}
        <Actions busy={busy} onCancel={onCancel} />
      </form>
    </Drawer>
  )
}

// ================================================================ Shop-Produkt
const KINDS: [string, string][] = [['supplement', 'Supplement'], ['apparel', 'Bekleidung'], ['gear', 'Zubehör']]
const emptyVariant = (): SaveVariant => ({ id: null, size: null, color: null, colorHex: null, flavor: null, priceToman: null })

export function ProductForm({ product, onDone, onCancel }: { product: AdminProduct | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: product?.name ?? '', brand: product?.brandName ?? '', kind: product?.kind ?? 'supplement', category: product?.category ?? '',
    description: product?.description ?? '', price: product ? centsToInput(product.priceToman) : '', image: product?.imagePath ?? '',
    highlights: (product?.highlights ?? []).join('\n'), active: product?.isActive ?? true,
  })
  const [variants, setVariants] = useState<SaveVariant[]>(product?.variantDetails?.length ? product.variantDetails : [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setV = (i: number, p: Partial<SaveVariant>) => setVariants((l) => l.map((v, j) => (j === i ? { ...v, ...p } : v)))
  const blank = (s: string) => (s.trim() === '' ? null : s)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const body = { name: f.name, brandName: f.brand, kind: f.kind, category: f.category, description: f.description || null, priceToman: euro(f.price), imagePath: f.image, isActive: f.active,
      highlights: f.highlights.split('\n').map((x) => x.trim()).filter(Boolean), variants }
    try { if (product) await panelApi.editProduct(product.id, body); else await panelApi.createProduct(body); onDone() }
    catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <Drawer title={product ? `Bearbeiten: ${product.name}` : 'Neues Produkt'} onClose={onCancel}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Produktname"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={sm} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marke"><input required value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={sm} /></Field>
          <Field label="Art">
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={`${sm} cursor-pointer`}>
              {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Untergruppe" hint="Für den Shop-Filter; z. B. Protein, Kreatin, T-Shirt, Shaker"><input required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={sm} /></Field>
        <Field label="Grundpreis (€)"><input required inputMode="numeric" dir="ltr" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={`${sm} text-right`} /></Field>
        <Field label="Beschreibung (optional)"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
        <Field label="Kurze Hinweise (einer pro Zeile, optional)"><textarea rows={3} value={f.highlights} onChange={(e) => setF({ ...f, highlights: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
        <div className="grid gap-1 text-[13px] font-bold text-chalk">Bild<ImagePicker value={f.image} onChange={(v) => setF({ ...f, image: v })} prefer="shop" /></div>

        <fieldset className="grid gap-2 rounded-[8px] border border-steel-2 p-3">
          <legend className="px-1 text-[13px] font-bold">Varianten (Größe, Farbe oder Geschmack)</legend>
          <p className="text-[12px] text-rubber">Leer lassen, wenn das Produkt nur eine Variante hat. Den Bestand jeder Variante später unter „Bestand und Preis“ je Filiale eintragen. Angelegte Varianten werden nicht gelöscht.</p>
          {variants.map((v, i) => (
            <div key={v.id ?? `n${i}`} className="grid grid-cols-2 gap-2 rounded-[6px] bg-steel p-2 sm:grid-cols-[1fr_1fr_64px_1fr_1fr_auto]">
              <input aria-label="Größe" placeholder="Größe" value={v.size ?? ''} onChange={(e) => setV(i, { size: blank(e.target.value) })} className={sm} />
              <input aria-label="Farbe" placeholder="Farbe" value={v.color ?? ''} onChange={(e) => setV(i, { color: blank(e.target.value) })} className={sm} />
              <input aria-label="Farbcode" type="color" value={v.colorHex ?? '#2c2c2c'} onChange={(e) => setV(i, { colorHex: e.target.value })} className="h-11 w-full cursor-pointer rounded-[3px] border border-steel-2" />
              <input aria-label="Geschmack" placeholder="Geschmack" value={v.flavor ?? ''} onChange={(e) => setV(i, { flavor: blank(e.target.value) })} className={sm} />
              <input aria-label="Preis dieser Variante" placeholder="Preis (optional)" inputMode="numeric" dir="ltr" value={v.priceToman == null ? '' : v.priceToman / 100} onChange={(e) => setV(i, { priceToman: optEuro(e.target.value) })} className={`${sm} text-right`} />
              {v.id === null
                ? <button type="button" onClick={() => setVariants((l) => l.filter((_, j) => j !== i))} aria-label="Zeile löschen" className="grid size-11 cursor-pointer place-items-center rounded-[3px] text-rubber hover:text-danger"><Trash2 className="size-4" /></button>
                : <span />}
            </div>
          ))}
          <Btn type="button" variant="ghost" className="h-10 justify-self-start" onClick={() => setVariants((l) => [...l, emptyVariant()])}><Plus className="size-4" aria-hidden />Variante hinzufügen</Btn>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-bold"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--color-plate)]" />Auf der Seite anzeigen</label>
        {err && <Notice tone="err">{err}</Notice>}
        <Actions busy={busy} onCancel={onCancel} />
      </form>
    </Drawer>
  )
}

// ================================================================ Trainer
export const SECTIONS: [string, string][] = [['men', 'Herren'], ['women', 'Damen'], ['both', 'Beide']]

export function CoachForm({ coach, branches, onDone, onCancel }: { coach: AdminCoach | null; branches: Branch[]; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: coach?.fullName ?? '', specialty: coach?.specialty ?? '', bio: coach?.bio ?? '', years: String(coach?.yearsOfExperience ?? 1),
    section: coach?.section ?? 'men', branch: coach?.branchSlug ?? branches[0]?.slug ?? '', photo: coach?.photoUrl ?? '',
    achievements: (coach?.achievements ?? []).join('\n'), active: coach?.isActive ?? true, phone: coach?.linkedPhone ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const body = { fullName: f.name, specialty: f.specialty, bio: f.bio || null, yearsOfExperience: num(f.years), section: f.section, branchSlug: f.branch,
      photoUrl: f.photo || null, achievements: f.achievements.split('\n').map((x) => x.trim()).filter(Boolean), isActive: f.active, linkedPhone: f.phone.trim() ? toLatinDigits(f.phone) : null }
    try { await panelApi.saveCoach(coach?.id ?? null, body); onDone() } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <Drawer title={coach ? `Bearbeiten: ${coach.fullName}` : 'Neuer Trainer'} onClose={onCancel}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Vor- und Nachname"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={sm} /></Field>
        <Field label="Fachgebiet" hint="Erscheint auf der Seite unter dem Namen"><input required value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} className={sm} placeholder="z. B. Muskelaufbau, Pilates" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Filiale">
            <select value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} className={`${sm} cursor-pointer`}>
              {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Bereich">
            <select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value as 'men' | 'women' | 'both' })} className={`${sm} cursor-pointer`}>
              {SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Jahre Erfahrung"><input inputMode="numeric" dir="ltr" value={f.years} onChange={(e) => setF({ ...f, years: e.target.value })} className={`${sm} max-w-[140px] text-right`} /></Field>
        <Field label="Kurzvorstellung (optional)"><textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
        <Field label="Erfolge und Zertifikate (eins pro Zeile, optional)"><textarea rows={3} value={f.achievements} onChange={(e) => setF({ ...f, achievements: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
        <div className="grid gap-1 text-[13px] font-bold text-chalk">Foto (optional; ohne Foto werden die Initialen gezeigt)
          <ImagePicker value={f.photo} onChange={(v) => setF({ ...f, photo: v })} prefer="uploads" />
          {f.photo && <button type="button" onClick={() => setF({ ...f, photo: '' })} className="justify-self-start text-[12px] font-bold text-rubber hover:text-danger">Foto entfernen</button>}
        </div>
        <div className="rounded-[8px] bg-steel p-3">
          <Field label="Handynummer des Trainers für das „Trainerpanel“ (optional)" hint="Er meldet sich mit dieser Nummer und einem SMS-Code an und sieht nur seine eigenen Schüler. Leer = kein Konto.">
            <input dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="09…" className={`${sm} text-right`} />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-bold"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--color-plate)]" />Auf der Seite anzeigen</label>
        {err && <Notice tone="err">{err}</Notice>}
        <Actions busy={busy} onCancel={onCancel} extra={coach && <DeleteButton onDelete={async () => {
          try { await panelApi.deleteCoach(coach.id); onDone() } catch (x) { setErr(errText(x)) }
        }} />} />
      </form>
    </Drawer>
  )
}
