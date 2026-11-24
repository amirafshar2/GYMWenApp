import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Download, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { panelApi } from '@/lib/panel'
import { downloadBlob } from '@/lib/api'
import { reloadSite, type CardItem, type SectionKey, type SimpleSection, type SiteConfig } from '@/lib/site'
import { ICONS } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, Spinner, toLatinDigits } from '@/member/ui'
import LiteDoc from '@/components/LiteDoc'
import { PanelTitle } from './PanelLayout'
import { ImagePicker } from './CatalogForms'

type Errors = Record<string, string[]>
const TABS = [
  ['brand', 'Name und Logo'], ['theme', 'Farben'], ['contact', 'Kontakt'], ['home', 'Startseite'], ['legal', 'Rechtsseiten'], ['modules', 'Bereiche der Seite'], ['package', 'Inhaltspaket'],
] as const
type Tab = (typeof TABS)[number][0]

const SECTION_LABEL: Record<SectionKey, string> = {
  intro: 'Was wir tun (Angebote)', why: 'Warum wir', video: 'Video', offer: 'Was wir bieten', branches: 'Filialen', pricing: 'Pakete',
  shop: 'Shop', events: 'Aktion', gallery: 'Galerie', coaches: 'Trainer', faq: 'Häufige Fragen', contact: 'Kostenlose Beratung',
}
const PALETTES: [string, string, string, string][] = [
  ['Blau', '#0B5FB0', '#FFB400', '#181818'], ['Rot', '#C62832', '#FFB400', '#1A1414'], ['Grün', '#13804B', '#F2C230', '#121A16'],
  ['Orange', '#D9541E', '#2B2B2B', '#1C1612'], ['Lila', '#6D3FB5', '#F5B83D', '#17131F'], ['Schwarz', '#222222', '#E8B73A', '#0E0E0E'],
]
const HREFS: [string, string][] = [['#branches', 'Filialen'], ['#packages', 'Pakete'], ['#coaches', 'Trainer'], ['#consult', 'Beratung'], ['#gallery', 'Galerie'], ['/shop', 'Shop']]

/** Website-Einstellungen: alle Texte, Bilder, Farben und Bereiche — jede Änderung hier ist sofort auf der Seite */
export default function SiteSettingsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'brand') as Tab
  const [cfg, setCfg] = useState<SiteConfig | null>(null)
  const [saved, setSaved] = useState<string>('')
  const [errors, setErrors] = useState<Errors>({})
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => { panelApi.site().then((c) => { setCfg(c); setSaved(JSON.stringify(c)) }).catch((e: Error) => setLoadErr(e.message)) }, [])
  const dirty = !!cfg && JSON.stringify(cfg) !== saved
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [dirty])

  if (loadErr) return <Notice tone="err">{loadErr}</Notice>
  if (!cfg) return <Spinner />

  const set = <K extends keyof SiteConfig>(k: K, v: Partial<SiteConfig[K]>) => setCfg({ ...cfg, [k]: { ...cfg[k], ...v } })
  const save = async () => {
    setBusy(true); setMsg(null); setErrors({})
    try {
      const r = await panelApi.saveSite(cfg)
      setCfg(r); setSaved(JSON.stringify(r))
      await reloadSite()
      setMsg({ tone: 'ok', text: 'Gespeichert und auf der Seite übernommen.' })
    } catch (e) {
      const x = e as Error & { errors?: Errors }
      setErrors(x.errors ?? {})
      setMsg({ tone: 'err', text: x.errors ? `${Object.keys(x.errors).length} Punkt(e) korrigieren (rot markiert).` : x.message })
    } finally { setBusy(false) }
  }
  const err = (k: string) => errors[Object.keys(errors).find((x) => x.toLowerCase() === k.toLowerCase()) ?? '']?.[0]
  const tabHasErr = (t: Tab) => Object.keys(errors).some((k) => k.toLowerCase().startsWith(t === 'modules' ? 'modules' : t))

  return (
    <>
      <PanelTitle title="Website-Einstellungen" sub="Name, Logo, Farben, Texte, Bilder und Bereiche der Seite. Nach „Speichern“ sofort auf der Seite sichtbar.">
        <a href="/" target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-[3px] border-2 border-steel-2 bg-white px-4 text-[14px] font-bold text-chalk hover:border-chalk"><Eye className="size-4" aria-hidden />Website ansehen</a>
      </PanelTitle>

      <div role="tablist" aria-label="Bereiche der Einstellungen" className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}
            className={cn('h-10 shrink-0 cursor-pointer rounded-full px-4 text-[14px] font-bold transition-colors',
              tab === k ? 'bg-chalk text-white' : 'bg-white text-chalk hover:bg-steel-2', tabHasErr(k) && tab !== k && 'ring-2 ring-danger')}>
            {label}
          </button>
        ))}
      </div>

      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}

      <div className="grid gap-4 pb-24">
        {tab === 'brand' && <BrandTab c={cfg} set={set} err={err} />}
        {tab === 'theme' && <ThemeTab c={cfg} set={set} err={err} />}
        {tab === 'contact' && <ContactTab c={cfg} set={set} err={err} />}
        {tab === 'home' && <HomeTab c={cfg} setHome={(v) => set('home', v)} err={err} errKeys={Object.keys(errors)} />}
        {tab === 'legal' && <LegalTab c={cfg} set={set} err={err} />}
        {tab === 'modules' && <ModulesTab c={cfg} set={set} />}
        {tab === 'package' && <PackageTab />}
      </div>

      {tab !== 'package' && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-steel-2 bg-white/95 backdrop-blur lg:left-[260px]">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
            <Btn onClick={save} busy={busy} disabled={!dirty}><Check className="size-4" aria-hidden />Speichern und übernehmen</Btn>
            {dirty ? <span className="text-[13px] font-bold text-[#7a5600]">Ungespeicherte Änderungen</span> : <span className="text-[13px] text-rubber">Alles gespeichert</span>}
            {dirty && <button type="button" onClick={() => { setCfg(JSON.parse(saved)); setErrors({}) }} className="cursor-pointer text-[13px] font-bold text-rubber hover:text-chalk">Änderungen verwerfen</button>}
          </div>
        </div>
      )}
    </>
  )
}

// ================================================================ Formularbausteine
type Err = (k: string) => string | undefined
type SetFn = <K extends keyof SiteConfig>(k: K, v: Partial<SiteConfig[K]>) => void

function F({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('grid content-start gap-1 text-[13px] font-bold text-chalk', className)}>
      {label}{children}
      {error ? <span role="alert" className="text-[12px] font-bold text-danger">{error}</span> : hint && <span className="text-[12px] font-normal leading-5 text-rubber">{hint}</span>}
    </label>
  )
}
const Text = ({ value, onChange, error, dir, max, placeholder }: { value: string | null | undefined; onChange: (v: string) => void; error?: string; dir?: 'ltr'; max?: number; placeholder?: string }) => (
  <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} dir={dir} maxLength={max} placeholder={placeholder} aria-invalid={!!error}
    className={cn(inputCls, 'h-11', dir === 'ltr' && 'text-right')} />
)
const Area = ({ value, onChange, error, rows = 3, max }: { value: string | null | undefined; onChange: (v: string) => void; error?: string; rows?: number; max?: number }) => (
  <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={max} aria-invalid={!!error} className={cn(inputCls, 'py-2.5 leading-7')} />
)
function Card({ title, sub, children, aside }: { title: string; sub?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-[17px] font-black text-chalk">{title}</h2>{sub && <p className="mt-0.5 text-[13px] text-rubber">{sub}</p>}</div>
        {aside}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Panel>
  )
}
const PH = <span>Sie können <b dir="ltr">{'{name} {short} {city} {branches} {phone}'}</b> verwenden.</span>

// ================================================================ Name und Logo
function BrandTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const b = c.brand, s = (v: Partial<SiteConfig['brand']>) => set('brand', v)
  return (
    <>
      <Card title="Name des Studios" sub="Erscheint in Header, Footer, Seitentitel, SMS, Rechnung und Vertrag.">
        <F label="Vollständiger Name" hint="z. B. „Fitnessstudios …“" error={err('brand.name')}><Text value={b.name} onChange={(v) => s({ name: v })} max={80} /></F>
        <F label="Kurzname (neben dem Logo)" hint="Ein oder zwei Wörter" error={err('brand.shortName')}><Text value={b.shortName} onChange={(v) => s({ shortName: v })} max={24} /></F>
        <F label="Lateinischer Name" hint="Das erste Wort erscheint in Großbuchstaben hinter dem Hauptbild." error={err('brand.latinName')}><Text dir="ltr" value={b.latinName} onChange={(v) => s({ latinName: v })} max={40} placeholder="IRON GYM" /></F>
        <F label="Stadt" error={err('brand.city')}><Text value={b.city} onChange={(v) => s({ city: v })} max={40} /></F>
        <F label="Kurzbeschreibung (für Google)" className="sm:col-span-2" error={err('brand.description')}><Area value={b.description} onChange={(v) => s({ description: v })} rows={2} max={200} /></F>
      </Card>
      <Card title="Slogans" sub="Mit „;“ wird der Slogan zweigeteilt, der zweite Teil erscheint farbig.">
        <F label="Hauptslogan (auf dem ersten Bild)" error={err('brand.slogan')}><Text value={b.slogan} onChange={(v) => s({ slogan: v })} max={80} /></F>
        <F label="Slogan im Filialbereich" error={err('brand.nearSlogan')}><Text value={b.nearSlogan} onChange={(v) => s({ nearSlogan: v })} max={80} /></F>
        <F label="Label des Bereichs „Warum wir“" error={err('brand.whySlogan')}><Text value={b.whySlogan} onChange={(v) => s({ whySlogan: v })} max={40} /></F>
      </Card>
      <Card title="Logo" sub="Ein rundes oder quadratisches Logo mit transparentem Hintergrund (PNG oder WebP) wirkt am besten.">
        <F label="Kleines Logo (Header und Browser-Icon)" error={err('brand.logoUrl')}><ImagePicker prefer="site" value={b.logoUrl ?? ''} onChange={(v) => s({ logoUrl: v })} hint="Quadratisch, mindestens 256×256 Pixel." /></F>
        <F label="Vollständiges Logo (Footer, optional)" error={err('brand.logoFullUrl')}><ImagePicker prefer="site" wide value={b.logoFullUrl ?? ''} onChange={(v) => s({ logoFullUrl: v })} hint="Leer = das kleine Logo wird verwendet." /></F>
      </Card>
    </>
  )
}

// ================================================================ Farben
function ThemeTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const t = c.theme, s = (v: Partial<SiteConfig['theme']>) => set('theme', v)
  const Color = ({ k, label, hint }: { k: keyof SiteConfig['theme']; label: string; hint: string }) => (
    <F label={label} hint={hint} error={err(`theme.${k}`)}>
      <span className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(t[k]) ? t[k] : '#000000'} onChange={(e) => s({ [k]: e.target.value.toUpperCase() })} aria-label={label}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-[3px] border border-steel-2 bg-white p-1" />
        <Text dir="ltr" value={t[k]} onChange={(v) => s({ [k]: v.trim() })} max={7} />
      </span>
    </F>
  )
  return (
    <>
      <Card title="Farben der Seite" sub="Hellere und dunklere Varianten (für Hover und Text auf dunklem Grund) werden automatisch erzeugt.">
        <Color k="primary" label="Hauptfarbe" hint="Buttons, Links und Akzente — idealerweise die Logofarbe." />
        <Color k="accent" label="Zweitfarbe" hint="„Los geht’s“-Button und Markierungen." />
        <Color k="dark" label="Dunkle Farbe" hint="Footer und Beratungsbereich." />
      </Card>
      <Panel className="p-5">
        <h2 className="mb-3 text-[15px] font-black text-chalk">Fertige Kombinationen</h2>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map(([name, p, a, d]) => (
            <button key={name} type="button" onClick={() => s({ primary: p, accent: a, dark: d })}
              className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-steel-2 bg-white py-1.5 pe-4 ps-1.5 text-[13px] font-bold hover:border-chalk">
              <span className="flex">{[p, a, d].map((x) => <span key={x} className="-ms-1 size-6 rounded-full border-2 border-white first:ms-0" style={{ background: x }} />)}</span>{name}
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-[6px] border border-steel-2" aria-label="Vorschau">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4">
            <span className="rounded-[3px] px-5 py-2.5 text-[14px] font-bold text-white" style={{ background: t.primary }}>Online anmelden</span>
            <span className="rounded-[3px] px-5 py-2.5 text-[14px] font-bold text-chalk" style={{ background: t.accent }}>Los geht’s</span>
            <span className="text-[14px] font-bold" style={{ color: t.primary }}>Beispiellink</span>
          </div>
          <div className="p-4 text-[14px] text-white/80" style={{ background: t.dark }}>Footer der Seite</div>
        </div>
      </Panel>
    </>
  )
}

// ================================================================ Kontakt
function ContactTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const x = c.contact, s = (v: Partial<SiteConfig['contact']>) => set('contact', v)
  return (
    <Card title="Kontaktdaten" sub="Erscheint in Header, Footer, Beratungsbereich und Rechtsseiten.">
      <F label="Service-Telefon" hint="Handy oder Festnetz mit Vorwahl" error={err('contact.phone')}><Text dir="ltr" value={x.phone} onChange={(v) => s({ phone: toLatinDigits(v) })} max={14} placeholder="01571234567" /></F>
      <F label="E-Mail" error={err('contact.email')}><Text dir="ltr" value={x.email} onChange={(v) => s({ email: v })} max={120} /></F>
      <F label="Adresse der Zentrale" className="sm:col-span-2" error={err('contact.address')}><Text value={x.address} onChange={(v) => s({ address: v })} max={300} /></F>
      <F label="Instagram" error={err('contact.instagram')}><Text dir="ltr" value={x.instagram} onChange={(v) => s({ instagram: v })} placeholder="https://instagram.com/…" /></F>
      <F label="Telegram" error={err('contact.telegram')}><Text dir="ltr" value={x.telegram} onChange={(v) => s({ telegram: v })} placeholder="https://t.me/…" /></F>
      <F label="WhatsApp" error={err('contact.whatsApp')}><Text dir="ltr" value={x.whatsApp} onChange={(v) => s({ whatsApp: v })} placeholder="https://wa.me/98…" /></F>
      <F label="Antwortzeit bei Beratung" error={err('contact.responseTime')}><Text value={x.responseTime} onChange={(v) => s({ responseTime: v })} max={40} /></F>
      <F label="Vertrauenssiegel — id" hint="nach Ausstellung des Siegels" error={err('contact.enamadId')}><Text dir="ltr" value={x.enamadId} onChange={(v) => s({ enamadId: toLatinDigits(v) })} max={12} /></F>
      <F label="Vertrauenssiegel — Code" error={err('contact.enamadCode')}><Text dir="ltr" value={x.enamadCode} onChange={(v) => s({ enamadCode: v })} max={40} /></F>
    </Card>
  )
}

// ================================================================ Startseite
function HomeTab({ c, setHome, err, errKeys }: { c: SiteConfig; setHome: (v: Partial<SiteConfig['home']>) => void; err: Err; errKeys: string[] }) {
  const h = c.home
  const [open, setOpen] = useState<string>('hero')
  const move = (i: number, d: -1 | 1) => {
    const l = [...h.sections]; const j = i + d
    if (j < 0 || j >= l.length) return
    ;[l[i], l[j]] = [l[j], l[i]]; setHome({ sections: l })
  }
  const toggle = (i: number) => setHome({ sections: h.sections.map((s, k) => (k === i ? { ...s, enabled: !s.enabled } : s)) })
  const sec = <K extends keyof SiteConfig['home']>(k: K) => (v: Partial<SiteConfig['home'][K]>) => setHome({ [k]: { ...(h[k] as object), ...v } } as Partial<SiteConfig['home']>)

  const editors: Record<string, ReactNode> = {
    hero: <>
      <F label="Label über dem Slogan" hint={PH} error={err('home.hero.eyebrow')}><Text value={h.hero.eyebrow} onChange={(v) => sec('hero')({ eyebrow: v })} /></F>
      <F label="Text unter dem Slogan" error={err('home.hero.body')} className="sm:col-span-2"><Area value={h.hero.body} onChange={(v) => sec('hero')({ body: v })} max={300} /></F>
      <F label="Erster Button" error={err('home.hero.primaryCta')}><Text value={h.hero.primaryCta} onChange={(v) => sec('hero')({ primaryCta: v })} max={30} /></F>
      <F label="Zweiter Button" error={err('home.hero.secondaryCta')}><Text value={h.hero.secondaryCta} onChange={(v) => sec('hero')({ secondaryCta: v })} max={30} /></F>
      <F label="Hauptbild" error={err('home.hero.imageUrl')} hint="Wird mit Partikeleffekt gezeigt; ein Motiv vor hellem, schlichtem Hintergrund wirkt am besten."><ImagePicker prefer="site" wide value={h.hero.imageUrl} onChange={(v) => sec('hero')({ imageUrl: v })} /></F>
      <F label="Hauptbild auf dem Handy" error={err('home.hero.mobileImageUrl')}><ImagePicker prefer="site" value={h.hero.mobileImageUrl} onChange={(v) => sec('hero')({ mobileImageUrl: v })} hint="Hochformat; leer = gleiches Hauptbild" /></F>
    </>,
    intro: <>
      <F label="Label" error={err('home.intro.eyebrow')}><Text value={h.intro.eyebrow} onChange={(v) => sec('intro')({ eyebrow: v })} /></F>
      <F label="Überschrift" hint={PH} error={err('home.intro.title')}><Text value={h.intro.title} onChange={(v) => sec('intro')({ title: v })} max={160} /></F>
      <Cards className="sm:col-span-2" label="Angebotskarten (Hochformatbilder)" items={h.intro.cards} max={8} image onChange={(cards) => sec('intro')({ cards })} errPrefix="home.intro.cards" err={err} />
    </>,
    why: <>
      <F label="Überschrift" error={err('home.why.title')}><Text value={h.why.title} onChange={(v) => sec('why')({ title: v })} max={120} /></F>
      <F label="Text auf dem Bild (Link zu den Paketen)" error={err('home.why.imageCta')}><Text value={h.why.imageCta} onChange={(v) => sec('why')({ imageCta: v })} max={60} /></F>
      <F label="Text" hint={PH} className="sm:col-span-2" error={err('home.why.text')}><Area value={h.why.text} onChange={(v) => sec('why')({ text: v })} max={400} /></F>
      <F label="Bild" error={err('home.why.imageUrl')}><ImagePicker prefer="site" value={h.why.imageUrl} onChange={(v) => sec('why')({ imageUrl: v })} /></F>
      <div className="grid content-start gap-4">
        <F label="Gründungsjahr" hint="Für die Zahl „Jahre Erfahrung“; leer = nicht anzeigen"><Text dir="ltr" value={h.why.foundedYear?.toString() ?? ''} onChange={(v) => sec('why')({ foundedYear: v.trim() ? Number(toLatinDigits(v)) || null : null })} max={4} placeholder="1395" /></F>
        <F label="Anzahl aktiver Mitglieder" hint="Leer = nicht anzeigen"><Text dir="ltr" value={h.why.members?.toString() ?? ''} onChange={(v) => sec('why')({ members: v.trim() ? Number(toLatinDigits(v).replace(/[,٬]/g, '')) || null : null })} max={8} /></F>
      </div>
      <Cards className="sm:col-span-2" label="Punkte" items={h.why.points} max={6} text onChange={(points) => sec('why')({ points })} errPrefix="home.why.points" err={err} />
    </>,
    video: <>
      <F label="Slogan auf dem Video" error={err('home.video.title')}><Text value={h.video.title} onChange={(v) => sec('video')({ title: v })} max={80} /></F>
      <VideoField className="sm:col-span-2" value={h.video} onChange={(v) => sec('video')(v)} err={err('home.video.videoUrl')} />
      <F label="Bild (für Sparmodus und langsames Internet)" error={err('home.video.posterUrl')}><ImagePicker prefer="site" wide value={h.video.posterUrl} onChange={(v) => sec('video')({ posterUrl: v })} /></F>
      <F label="Bild auf dem Handy" error={err('home.video.mobilePosterUrl')}><ImagePicker prefer="site" value={h.video.mobilePosterUrl ?? ''} onChange={(v) => sec('video')({ mobilePosterUrl: v })} hint="Hochformat; leer = gleiches Bild" /></F>
    </>,
    offer: <>
      <F label="Label" error={err('home.offer.eyebrow')}><Text value={h.offer.eyebrow} onChange={(v) => sec('offer')({ eyebrow: v })} /></F>
      <F label="Überschrift" error={err('home.offer.title')}><Text value={h.offer.title} onChange={(v) => sec('offer')({ title: v })} max={120} /></F>
      <Cards className="sm:col-span-2" label="Leistungen" items={h.offer.items} max={12} text icon href onChange={(items) => sec('offer')({ items })} errPrefix="home.offer.items" err={err} />
    </>,
    events: <>
      <F label="Label" error={err('home.events.eyebrow')}><Text value={h.events.eyebrow} onChange={(v) => sec('events')({ eyebrow: v })} /></F>
      <F label="Überschrift" error={err('home.events.title')}><Text value={h.events.title} onChange={(v) => sec('events')({ title: v })} max={120} /></F>
      <F label="Text (wenn keine Aktion läuft)" className="sm:col-span-2" error={err('home.events.text')}><Area value={h.events.text} onChange={(v) => sec('events')({ text: v })} max={400} /></F>
      <F label="Erstes Bild"><ImagePicker prefer="site" value={h.events.imageUrl} onChange={(v) => sec('events')({ imageUrl: v })} /></F>
      <F label="Zweites Bild"><ImagePicker prefer="site" value={h.events.secondImageUrl} onChange={(v) => sec('events')({ secondImageUrl: v })} /></F>
    </>,
    gallery: <>
      <F label="Überschrift" hint={PH} error={err('home.gallery.title')} className="sm:col-span-2"><Text value={h.gallery.title} onChange={(v) => sec('gallery')({ title: v })} max={120} /></F>
      <Cards className="sm:col-span-2" label="Bilder (Titel = Bildbeschreibung für Screenreader)" items={h.gallery.images} max={24} image onChange={(images) => sec('gallery')({ images })} errPrefix="home.gallery.images" err={err} />
    </>,
  }
  const simple = (k: 'branches' | 'pricing' | 'shop' | 'coaches' | 'faq' | 'contact') => {
    const v = h[k] as SimpleSection
    return <>
      <F label="Label" hint={PH} error={err(`home.${k}.eyebrow`)}><Text value={v.eyebrow} onChange={(x) => sec(k)({ eyebrow: x })} max={60} /></F>
      <F label="Überschrift" hint="Mit „;“ wird der zweite Teil der Überschrift farbig." error={err(`home.${k}.title`)}><Text value={v.title} onChange={(x) => sec(k)({ title: x })} max={120} /></F>
      <F label="Text" className="sm:col-span-2" error={err(`home.${k}.text`)}><Area value={v.text} onChange={(x) => sec(k)({ text: x })} max={400} rows={2} /></F>
    </>
  }

  const blocks: { key: string; label: string; idx?: number }[] = [{ key: 'hero', label: 'Bild und Slogan oben auf der Seite (immer zuerst)' },
    ...h.sections.map((s, idx) => ({ key: s.key, label: SECTION_LABEL[s.key], idx }))]
  return (
    <>
      <Panel className="p-4 text-[13px] leading-6 text-rubber">Reihenfolge mit den Pfeilen ändern und mit dem Auge ein-/ausblenden. Auf einen Bereich tippen, um Texte und Bilder zu öffnen.</Panel>
      {blocks.map((b) => {
        const s = b.idx !== undefined ? h.sections[b.idx] : null
        const body = editors[b.key] ?? (['branches', 'pricing', 'shop', 'coaches', 'faq', 'contact'].includes(b.key) ? simple(b.key as 'faq') : null)
        const isOpen = open === b.key
        const hasErr = errKeys.some((k) => k.toLowerCase().startsWith(`home.${b.key}`.toLowerCase()))
        return (
          <Panel key={b.key} className={cn('overflow-hidden', s && !s.enabled && 'opacity-60', hasErr && 'ring-2 ring-danger')}>
            <div className="flex items-center gap-2 p-3 ps-4">
              <button type="button" onClick={() => setOpen(isOpen ? '' : b.key)} aria-expanded={isOpen} className="min-w-0 flex-1 cursor-pointer text-start text-[15px] font-black text-chalk">
                {b.label}{s && !s.enabled && <span className="ms-2 text-[12px] font-bold text-rubber">(aus)</span>}
              </button>
              {s && <>
                <IconBtn label="Nach oben" onClick={() => move(b.idx!, -1)} disabled={b.idx === 0}><ArrowUp className="size-4" /></IconBtn>
                <IconBtn label="Nach unten" onClick={() => move(b.idx!, 1)} disabled={b.idx === h.sections.length - 1}><ArrowDown className="size-4" /></IconBtn>
                <IconBtn label={s.enabled ? 'Ausblenden' : 'Einblenden'} onClick={() => toggle(b.idx!)}>{s.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</IconBtn>
              </>}
            </div>
            {isOpen && body && <div className="grid gap-4 border-t border-steel-2 p-4 sm:grid-cols-2">{body}</div>}
          </Panel>
        )
      })}
      <Card title="Footer und Kurzinfo">
        <F label="Eine kurze Vorstellungszeile" hint="Neben der Filialanzahl, z. B. „getrennte Herren- und Damenbereiche“" error={err('home.footerNote')}><Text value={h.footerNote} onChange={(v) => setHome({ footerNote: v })} max={120} /></F>
      </Card>
    </>
  )
}

/** Video: Vorlage / eigener Upload / kein Video; nach dem Upload wird alle 4 Sekunden der Optimierungsstatus abgefragt */
function VideoField({ value, onChange, err, className }: { value: SiteConfig['home']['video']; onChange: (v: Partial<SiteConfig['home']['video']>) => void; err?: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [pct, setPct] = useState<number | null>(null)
  const [job, setJob] = useState<{ id: string; state: 'optimizing' | 'ready' | 'failed'; msg?: string } | null>(null)
  const [upErr, setUpErr] = useState<string | null>(null)
  const kind = !value.videoUrl ? 'none' : value.videoUrl.startsWith('/media/videos/') ? 'upload' : 'builtin'
  const pending = /^\/media\/videos\/([a-f0-9]{32})\.mp4$/.exec(value.videoUrl ?? '')?.[1]

  // Hochgeladenes, noch nicht optimiertes Video (z. B. Seite neu geöffnet): Abfrage fortsetzen
  useEffect(() => { if (pending && value.optimized === false && !job) setJob({ id: pending, state: 'optimizing' }) }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (job?.state !== 'optimizing') return
    let stop = false
    const poll = async () => {
      try {
        const s = await panelApi.videoStatus(job.id)
        if (stop) return
        if (s.ready) {
          setJob({ id: job.id, state: 'ready' })
          onChange({ optimized: true, ...(value.posterUrl ? {} : { posterUrl: s.poster ?? '' }) })
        } else if (s.failed) setJob({ id: job.id, state: 'failed', msg: s.failed })
        else t = window.setTimeout(poll, 4000)
      } catch { if (!stop) t = window.setTimeout(poll, 4000) }
    }
    let t = window.setTimeout(poll, 1500)
    return () => { stop = true; clearTimeout(t) }
  }, [job?.id, job?.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (f: File | undefined) => {
    if (!f) return
    setUpErr(null); setPct(0)
    try {
      const r = await panelApi.uploadVideo(f, setPct)
      onChange({ videoUrl: r.url, optimized: false })
      setJob({ id: r.video, state: 'optimizing' })
    } catch (e) { setUpErr((e as Error).message) } finally { setPct(null) }
  }

  return (
    <div className={cn('grid gap-3 rounded-[6px] border border-steel-2 bg-steel/50 p-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-bold text-chalk">Video</span>
        <select value={kind} aria-label="Video" onChange={(e) => onChange(e.target.value === 'none' ? { videoUrl: null } : e.target.value === 'builtin' ? { videoUrl: '/media/video/gym.mp4', optimized: true } : {})}
          className={cn(inputCls, 'h-10 w-auto cursor-pointer')}>
          <option value="builtin">Video der Vorlage</option>
          {kind === 'upload' && <option value="upload">Hochgeladenes Video</option>}
          <option value="none">Kein Video (nur Bild)</option>
        </select>
        <Btn type="button" variant="dark" className="h-10" busy={pct !== null} onClick={() => input.current?.click()}>Eigenes Video hochladen</Btn>
        <input ref={input} type="file" accept="video/mp4,video/quicktime" className="sr-only" aria-label="Videodatei"
          onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p className="text-[12px] leading-5 text-rubber">MP4 oder MOV, höchstens 80 MB, 60 Sekunden und 4K. Der Server erzeugt leichte Versionen für Handy, Tablet und Computer; der Ton wird entfernt.</p>
      {pct !== null && (
        <div className="grid gap-1" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-steel-2"><div className="h-full bg-plate transition-[width]" style={{ width: `${pct}%` }} /></div>
          <span className="text-[12px] text-rubber">Wird hochgeladen… {pct}%</span>
        </div>
      )}
      {job?.state === 'optimizing' && <Notice tone="info">Wird optimiert… (einige Minuten; Sie können speichern und die Seite schließen)</Notice>}
      {job?.state === 'ready' && <Notice tone="ok">Das Video ist bereit. Zum Übernehmen „Speichern“ drücken.</Notice>}
      {job?.state === 'failed' && <Notice tone="err">{job.msg}</Notice>}
      {(upErr || err) && <Notice tone="err">{upErr ?? err}</Notice>}
      {value.videoUrl && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wiedergabe">
          {([['scrub', 'Beim Scrollen vor- und zurücklaufen'], ['loop', 'Automatisch in Schleife abspielen']] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={(value.mode ?? 'scrub') === k} onClick={() => onChange({ mode: k })}
              className={cn('h-10 cursor-pointer rounded-full border-2 px-4 text-[13px] font-bold', (value.mode ?? 'scrub') === k ? 'border-plate bg-plate text-white' : 'border-steel-2 bg-white text-chalk')}>{l}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-chalk hover:bg-steel disabled:cursor-default disabled:opacity-30">{children}</button>
}

/** Kartenliste: Titel + (Text, Bild, Icon, Link je nach Bereich) */
function Cards({ label, items, onChange, max, image, text, icon, href, className, errPrefix, err }: {
  label: string; items: CardItem[]; onChange: (v: CardItem[]) => void; max: number; image?: boolean; text?: boolean; icon?: boolean; href?: boolean
  className?: string; errPrefix: string; err: Err
}) {
  const up = (i: number, v: Partial<CardItem>) => onChange(items.map((x, k) => (k === i ? { ...x, ...v } : x)))
  const move = (i: number, d: -1 | 1) => { const l = [...items]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; onChange(l) }
  return (
    <div className={cn('grid gap-2', className)}>
      <p className="text-[13px] font-bold text-chalk">{label}</p>
      {items.map((it, i) => (
        <div key={i} className="grid gap-3 rounded-[6px] border border-steel-2 bg-steel/50 p-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Titel" error={err(`${errPrefix}[${i}].title`)}><Text value={it.title} onChange={(v) => up(i, { title: v })} max={60} /></F>
            {icon && (
              <F label="Icon">
                <select value={it.icon ?? 'dumbbell'} onChange={(e) => up(i, { icon: e.target.value })} className={cn(inputCls, 'h-11 cursor-pointer')}>
                  {Object.entries(ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </F>
            )}
            {text && <F label="Beschreibung" className={icon ? '' : 'sm:col-span-1'} error={err(`${errPrefix}[${i}].text`)}><Text value={it.text} onChange={(v) => up(i, { text: v })} max={200} /></F>}
            {href && (
              <F label="Link">
                <select value={it.href ?? '#packages'} onChange={(e) => up(i, { href: e.target.value })} className={cn(inputCls, 'h-11 cursor-pointer')}>
                  {HREFS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </F>
            )}
            {image && <F label="Bild" error={err(`${errPrefix}[${i}].imageUrl`)}><ImagePicker prefer="site" value={it.imageUrl ?? ''} onChange={(v) => up(i, { imageUrl: v })} /></F>}
          </div>
          <div className="flex gap-1 sm:flex-col">
            <IconBtn label="Nach oben" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-4" /></IconBtn>
            <IconBtn label="Nach unten" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="size-4" /></IconBtn>
            <IconBtn label="Löschen" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="size-4 text-danger" /></IconBtn>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { title: '', icon: icon ? 'dumbbell' : null, href: href ? '#packages' : null }])}
          className="inline-flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-[3px] border-2 border-dashed border-steel-2 px-4 text-[13px] font-bold text-chalk hover:border-chalk">
          <Plus className="size-4" aria-hidden />Hinzufügen
        </button>
      )}
    </div>
  )
}

// ================================================================ Rechtsseiten
function LegalTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const [doc, setDoc] = useState<keyof SiteConfig['legal']>('about')
  const DOCS: [keyof SiteConfig['legal'], string][] = [['about', 'Über uns'], ['terms', 'AGB'], ['privacy', 'Datenschutz'], ['refund', 'Kündigung und Erstattung']]
  const todo = useMemo(() => (c.legal[doc].match(/\[\[[^\]]*\]\]/g) ?? []).length, [c.legal, doc])
  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {DOCS.map(([k, l]) => {
          const n = (c.legal[k].match(/\[\[/g) ?? []).length
          return <button key={k} type="button" onClick={() => setDoc(k)} className={cn('h-9 cursor-pointer rounded-full px-4 text-[13px] font-bold', doc === k ? 'bg-plate text-white' : 'bg-steel text-chalk')}>
            {l}{n > 0 && <span className="ms-1.5 rounded-full bg-sun px-1.5 text-[11px] text-chalk">{n}</span>}
          </button>
        })}
      </div>
      <p className="mb-3 text-[13px] leading-6 text-rubber">
        Eine Zeile, die mit <b dir="ltr">##</b> beginnt, ist eine Überschrift, mit <b dir="ltr">-</b> ein Listenpunkt. Alles zwischen <b dir="ltr">[[ ]]</b> wird gelb markiert, damit Sie es ergänzen{todo > 0 && <> — <b className="text-[#7a5600]">{todo} Lücken offen</b></>}.
        Den finalen Text sollte eine Rechtsberatung prüfen.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <F label="Text" error={err(`legal.${doc}`)}><Area value={c.legal[doc]} onChange={(v) => set('legal', { [doc]: v })} rows={22} max={12000} /></F>
        <div className="grid content-start gap-1 text-[13px] font-bold text-chalk">Vorschau
          <article className="max-h-[560px] overflow-y-auto rounded-[6px] border border-steel-2 bg-white p-4 text-[14px] font-normal leading-7 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-[16px] [&_h2]:font-black [&_li]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-5">
            <LiteDoc text={c.legal[doc]} />
          </article>
        </div>
      </div>
    </Panel>
  )
}

// ================================================================ Bereiche der Seite (Module)
function ModulesTab({ c, set }: { c: SiteConfig; set: SetFn }) {
  const m = c.modules
  const rows: [keyof SiteConfig['modules'], string, string][] = [
    ['shop', 'Online-Shop', 'Shopseite, Warenkorb und Shopbereich auf der Startseite'],
    ['canteen', 'Bistro-Karte mit QR', 'Bestellung am Tisch per QR-Scan in jeder Filiale'],
    ['wallet', 'Guthaben', 'Aufladen und Bezahlen mit Guthaben'],
    ['festival', 'Aktion und Countdown', 'Leiste oben auf der Seite und Aktionsseite'],
    ['coaches', 'Trainervorstellung', 'Trainerbereich auf der Startseite'],
    ['consultation', 'Formular für kostenlose Beratung', 'Formular zum Hinterlassen der Nummer für einen Rückruf'],
    ['cityMap', 'Schematische Filialkarte', 'Ab drei Filialen erscheinen die Filialen auf einer Stadtkarte; aus = einfache Liste'],
  ]
  return (
    <Panel className="divide-y divide-steel-2">
      {rows.map(([k, title, sub]) => (
        <label key={k} className="flex cursor-pointer items-center gap-4 p-4">
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-black text-chalk">{title}</span><span className="text-[13px] text-rubber">{sub}</span></span>
          <input type="checkbox" checked={m[k]} onChange={(e) => set('modules', { [k]: e.target.checked })} className="size-5 cursor-pointer accent-[var(--color-plate)]" />
        </label>
      ))}
    </Panel>
  )
}

// ================================================================ Inhaltspaket
function PackageTab() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <Panel className="p-5">
      <h2 className="text-[17px] font-black text-chalk">Kompletter Export der Seiteninhalte</h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-7 text-rubber">
        Eine zip-Datei mit Filialen, Paketen, Trainern, FAQ, Vertrag, Produkten, Bistro-Karte, allen Einstellungen dieser Seite und hochgeladenen Bildern.
        Keine Daten von Mitgliedern, Zahlungen oder Mitarbeitern enthalten. Mit dieser Datei startet eine neue Installation mit genau diesem Inhalt
        (<b dir="ltr">Setup__Mode=Content</b> und <b dir="ltr">Setup__ContentFile</b>); auch als Inhaltssicherung geeignet.
      </p>
      {err && <Notice tone="err" className="mt-3">{err}</Notice>}
      <Btn className="mt-4" busy={busy} onClick={async () => {
        setBusy(true); setErr(null)
        try { await downloadBlob(() => panelApi.exportContent(), `site-content-${new Date().toISOString().slice(0, 10)}.zip`) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
      }}><Download className="size-4" aria-hidden />Inhaltspaket herunterladen</Btn>
    </Panel>
  )
}
