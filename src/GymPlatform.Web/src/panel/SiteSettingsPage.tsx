import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  ['brand', 'نام و لوگو'], ['theme', 'رنگ‌ها'], ['contact', 'تماس'], ['home', 'صفحهٔ اصلی'], ['legal', 'صفحه‌های قانونی'], ['modules', 'بخش‌های سایت'], ['package', 'بستهٔ محتوا'],
] as const
type Tab = (typeof TABS)[number][0]

const SECTION_LABEL: Record<SectionKey, string> = {
  intro: 'چه می‌کنیم (رشته‌ها)', why: 'چرا ما', video: 'ویدیو', offer: 'آنچه ارائه می‌دهیم', branches: 'شعبه‌ها', pricing: 'پکیج‌ها',
  shop: 'فروشگاه', events: 'جشنواره', gallery: 'گالری', coaches: 'مربیان', faq: 'سؤالات پرتکرار', contact: 'مشاورهٔ رایگان',
}
const PALETTES: [string, string, string, string][] = [
  ['آبی', '#0B5FB0', '#FFB400', '#181818'], ['قرمز', '#C62832', '#FFB400', '#1A1414'], ['سبز', '#13804B', '#F2C230', '#121A16'],
  ['نارنجی', '#D9541E', '#2B2B2B', '#1C1612'], ['بنفش', '#6D3FB5', '#F5B83D', '#17131F'], ['مشکی', '#222222', '#E8B73A', '#0E0E0E'],
]
const HREFS: [string, string][] = [['#branches', 'شعبه‌ها'], ['#packages', 'پکیج‌ها'], ['#coaches', 'مربیان'], ['#consult', 'مشاوره'], ['#gallery', 'گالری'], ['/shop', 'فروشگاه']]

/** تنظیمات سایت: همهٔ متن‌ها، عکس‌ها، رنگ‌ها و بخش‌ها — هر چه این‌جا عوض شود، همان لحظه روی سایت است */
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
      setMsg({ tone: 'ok', text: 'ذخیره شد و روی سایت اعمال شد.' })
    } catch (e) {
      const x = e as Error & { errors?: Errors }
      setErrors(x.errors ?? {})
      setMsg({ tone: 'err', text: x.errors ? `${Object.keys(x.errors).length} مورد را اصلاح کنید (با رنگ قرمز مشخص شده).` : x.message })
    } finally { setBusy(false) }
  }
  const err = (k: string) => errors[Object.keys(errors).find((x) => x.toLowerCase() === k.toLowerCase()) ?? '']?.[0]
  const tabHasErr = (t: Tab) => Object.keys(errors).some((k) => k.toLowerCase().startsWith(t === 'modules' ? 'modules' : t))

  return (
    <>
      <PanelTitle title="تنظیمات سایت" sub="نام، لوگو، رنگ، متن‌ها، عکس‌ها و بخش‌های سایت. بعد از «ذخیره» همان لحظه روی سایت دیده می‌شود.">
        <a href="/" target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-[3px] border-2 border-steel-2 bg-white px-4 text-[14px] font-bold text-chalk hover:border-chalk"><Eye className="size-4" aria-hidden />دیدن سایت</a>
      </PanelTitle>

      <div role="tablist" aria-label="بخش‌های تنظیمات" className="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1">
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-steel-2 bg-white/95 backdrop-blur lg:right-[260px]">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
            <Btn onClick={save} busy={busy} disabled={!dirty}><Check className="size-4" aria-hidden />ذخیره و اعمال روی سایت</Btn>
            {dirty ? <span className="text-[13px] font-bold text-[#7a5600]">تغییرات ذخیره نشده</span> : <span className="text-[13px] text-rubber">همه‌چیز ذخیره است</span>}
            {dirty && <button type="button" onClick={() => { setCfg(JSON.parse(saved)); setErrors({}) }} className="cursor-pointer text-[13px] font-bold text-rubber hover:text-chalk">برگرداندن تغییرات</button>}
          </div>
        </div>
      )}
    </>
  )
}

// ================================================================ اجزای فرم
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
    className={cn(inputCls, 'h-11', dir === 'ltr' && 'text-left')} />
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
const PH = <span>می‌توانید از <b dir="ltr">{'{name} {short} {city} {branches} {phone}'}</b> استفاده کنید.</span>

// ================================================================ نام و لوگو
function BrandTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const b = c.brand, s = (v: Partial<SiteConfig['brand']>) => set('brand', v)
  return (
    <>
      <Card title="نام باشگاه" sub="در هدر، فوتر، عنوان صفحه، پیامک‌ها، فاکتور و قرارداد استفاده می‌شود.">
        <F label="نام کامل" hint="مثل «مجموعه باشگاه‌های …»" error={err('brand.name')}><Text value={b.name} onChange={(v) => s({ name: v })} max={80} /></F>
        <F label="نام کوتاه (کنار لوگو)" hint="یک یا دو کلمه" error={err('brand.shortName')}><Text value={b.shortName} onChange={(v) => s({ shortName: v })} max={24} /></F>
        <F label="نام لاتین" hint="کلمهٔ اولش با حروف بزرگ پشت تصویر اصلی می‌آید." error={err('brand.latinName')}><Text dir="ltr" value={b.latinName} onChange={(v) => s({ latinName: v })} max={40} placeholder="IRON GYM" /></F>
        <F label="شهر" error={err('brand.city')}><Text value={b.city} onChange={(v) => s({ city: v })} max={40} /></F>
        <F label="توضیح کوتاه (برای گوگل)" className="sm:col-span-2" error={err('brand.description')}><Area value={b.description} onChange={(v) => s({ description: v })} rows={2} max={200} /></F>
      </Card>
      <Card title="شعارها" sub="با «؛» شعار دو تکه می‌شود و تکهٔ دوم رنگی نمایش داده می‌شود.">
        <F label="شعار اصلی (روی تصویر اول)" error={err('brand.slogan')}><Text value={b.slogan} onChange={(v) => s({ slogan: v })} max={80} /></F>
        <F label="شعار بخش شعبه‌ها" error={err('brand.nearSlogan')}><Text value={b.nearSlogan} onChange={(v) => s({ nearSlogan: v })} max={80} /></F>
        <F label="برچسب بخش «چرا ما»" error={err('brand.whySlogan')}><Text value={b.whySlogan} onChange={(v) => s({ whySlogan: v })} max={40} /></F>
      </Card>
      <Card title="لوگو" sub="لوگوی گرد یا مربعی با پس‌زمینهٔ شفاف (PNG یا WebP) بهترین نتیجه را دارد.">
        <F label="لوگوی کوچک (هدر و آیکن مرورگر)" error={err('brand.logoUrl')}><ImagePicker prefer="site" value={b.logoUrl ?? ''} onChange={(v) => s({ logoUrl: v })} hint="مربعی، دست‌کم ۲۵۶×۲۵۶ پیکسل." /></F>
        <F label="لوگوی کامل (فوتر، اختیاری)" error={err('brand.logoFullUrl')}><ImagePicker prefer="site" wide value={b.logoFullUrl ?? ''} onChange={(v) => s({ logoFullUrl: v })} hint="اگر خالی باشد همان لوگوی کوچک استفاده می‌شود." /></F>
      </Card>
    </>
  )
}

// ================================================================ رنگ‌ها
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
      <Card title="رنگ‌های سایت" sub="رنگ روشن‌تر و تیره‌تر (برای hover و متن روی زمینهٔ تیره) خودکار ساخته می‌شود.">
        <Color k="primary" label="رنگ اصلی" hint="دکمه‌ها، لینک‌ها و تأکیدها — بهتر است رنگ لوگو باشد." />
        <Color k="accent" label="رنگ دوم" hint="دکمهٔ «شروع کن» و نشانه‌ها." />
        <Color k="dark" label="رنگ تیره" hint="فوتر و بخش مشاوره." />
      </Card>
      <Panel className="p-5">
        <h2 className="mb-3 text-[15px] font-black text-chalk">ترکیب‌های آماده</h2>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map(([name, p, a, d]) => (
            <button key={name} type="button" onClick={() => s({ primary: p, accent: a, dark: d })}
              className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-steel-2 bg-white py-1.5 pe-4 ps-1.5 text-[13px] font-bold hover:border-chalk">
              <span className="flex">{[p, a, d].map((x) => <span key={x} className="-ms-1 size-6 rounded-full border-2 border-white first:ms-0" style={{ background: x }} />)}</span>{name}
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-[6px] border border-steel-2" aria-label="پیش‌نمایش">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4">
            <span className="rounded-[3px] px-5 py-2.5 text-[14px] font-bold text-white" style={{ background: t.primary }}>ثبت‌نام آنلاین</span>
            <span className="rounded-[3px] px-5 py-2.5 text-[14px] font-bold text-chalk" style={{ background: t.accent }}>شروع کن</span>
            <span className="text-[14px] font-bold" style={{ color: t.primary }}>لینک نمونه</span>
          </div>
          <div className="p-4 text-[14px] text-white/80" style={{ background: t.dark }}>فوتر سایت</div>
        </div>
      </Panel>
    </>
  )
}

// ================================================================ تماس
function ContactTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const x = c.contact, s = (v: Partial<SiteConfig['contact']>) => set('contact', v)
  return (
    <Card title="اطلاعات تماس" sub="در هدر، فوتر، بخش مشاوره و صفحه‌های قانونی نمایش داده می‌شود.">
      <F label="تلفن پشتیبانی" hint="موبایل یا ثابت با پیش‌شماره" error={err('contact.phone')}><Text dir="ltr" value={x.phone} onChange={(v) => s({ phone: toLatinDigits(v) })} max={14} placeholder="09121234567" /></F>
      <F label="ایمیل" error={err('contact.email')}><Text dir="ltr" value={x.email} onChange={(v) => s({ email: v })} max={120} /></F>
      <F label="آدرس دفتر مرکزی" className="sm:col-span-2" error={err('contact.address')}><Text value={x.address} onChange={(v) => s({ address: v })} max={300} /></F>
      <F label="اینستاگرام" error={err('contact.instagram')}><Text dir="ltr" value={x.instagram} onChange={(v) => s({ instagram: v })} placeholder="https://instagram.com/…" /></F>
      <F label="تلگرام" error={err('contact.telegram')}><Text dir="ltr" value={x.telegram} onChange={(v) => s({ telegram: v })} placeholder="https://t.me/…" /></F>
      <F label="واتساپ" error={err('contact.whatsApp')}><Text dir="ltr" value={x.whatsApp} onChange={(v) => s({ whatsApp: v })} placeholder="https://wa.me/98…" /></F>
      <F label="زمان پاسخ‌گویی به مشاوره" error={err('contact.responseTime')}><Text value={x.responseTime} onChange={(v) => s({ responseTime: v })} max={40} /></F>
      <F label="اینماد — id" hint="بعد از صدور نماد از enamad.ir" error={err('contact.enamadId')}><Text dir="ltr" value={x.enamadId} onChange={(v) => s({ enamadId: toLatinDigits(v) })} max={12} /></F>
      <F label="اینماد — Code" error={err('contact.enamadCode')}><Text dir="ltr" value={x.enamadCode} onChange={(v) => s({ enamadCode: v })} max={40} /></F>
    </Card>
  )
}

// ================================================================ صفحهٔ اصلی
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
      <F label="برچسب بالای شعار" hint={PH} error={err('home.hero.eyebrow')}><Text value={h.hero.eyebrow} onChange={(v) => sec('hero')({ eyebrow: v })} /></F>
      <F label="متن زیر شعار" error={err('home.hero.body')} className="sm:col-span-2"><Area value={h.hero.body} onChange={(v) => sec('hero')({ body: v })} max={300} /></F>
      <F label="دکمهٔ اول" error={err('home.hero.primaryCta')}><Text value={h.hero.primaryCta} onChange={(v) => sec('hero')({ primaryCta: v })} max={30} /></F>
      <F label="دکمهٔ دوم" error={err('home.hero.secondaryCta')}><Text value={h.hero.secondaryCta} onChange={(v) => sec('hero')({ secondaryCta: v })} max={30} /></F>
      <F label="تصویر اصلی" error={err('home.hero.imageUrl')} hint="با جلوهٔ ذرات نمایش داده می‌شود؛ سوژه روی زمینهٔ روشن و ساده بهتر است."><ImagePicker prefer="site" wide value={h.hero.imageUrl} onChange={(v) => sec('hero')({ imageUrl: v })} /></F>
      <F label="تصویر اصلی در موبایل" error={err('home.hero.mobileImageUrl')}><ImagePicker prefer="site" value={h.hero.mobileImageUrl} onChange={(v) => sec('hero')({ mobileImageUrl: v })} hint="عمودی؛ خالی = همان تصویر اصلی" /></F>
    </>,
    intro: <>
      <F label="برچسب" error={err('home.intro.eyebrow')}><Text value={h.intro.eyebrow} onChange={(v) => sec('intro')({ eyebrow: v })} /></F>
      <F label="تیتر" hint={PH} error={err('home.intro.title')}><Text value={h.intro.title} onChange={(v) => sec('intro')({ title: v })} max={160} /></F>
      <Cards className="sm:col-span-2" label="کارت‌های رشته (عکس عمودی)" items={h.intro.cards} max={8} image onChange={(cards) => sec('intro')({ cards })} errPrefix="home.intro.cards" err={err} />
    </>,
    why: <>
      <F label="تیتر" error={err('home.why.title')}><Text value={h.why.title} onChange={(v) => sec('why')({ title: v })} max={120} /></F>
      <F label="متن روی عکس (لینک به پکیج‌ها)" error={err('home.why.imageCta')}><Text value={h.why.imageCta} onChange={(v) => sec('why')({ imageCta: v })} max={60} /></F>
      <F label="متن" hint={PH} className="sm:col-span-2" error={err('home.why.text')}><Area value={h.why.text} onChange={(v) => sec('why')({ text: v })} max={400} /></F>
      <F label="عکس" error={err('home.why.imageUrl')}><ImagePicker prefer="site" value={h.why.imageUrl} onChange={(v) => sec('why')({ imageUrl: v })} /></F>
      <div className="grid content-start gap-4">
        <F label="سال تأسیس (شمسی)" hint="برای عدد «سال سابقه»؛ خالی = نمایش داده نشود"><Text dir="ltr" value={h.why.foundedYear?.toString() ?? ''} onChange={(v) => sec('why')({ foundedYear: v.trim() ? Number(toLatinDigits(v)) || null : null })} max={4} placeholder="1395" /></F>
        <F label="تعداد شاگرد فعال" hint="خالی = نمایش داده نشود"><Text dir="ltr" value={h.why.members?.toString() ?? ''} onChange={(v) => sec('why')({ members: v.trim() ? Number(toLatinDigits(v).replace(/[,٬]/g, '')) || null : null })} max={8} /></F>
      </div>
      <Cards className="sm:col-span-2" label="بندها" items={h.why.points} max={6} text onChange={(points) => sec('why')({ points })} errPrefix="home.why.points" err={err} />
    </>,
    video: <>
      <F label="شعار روی ویدیو" error={err('home.video.title')}><Text value={h.video.title} onChange={(v) => sec('video')({ title: v })} max={80} /></F>
      <F label="ویدیو" hint="ویدیوی اسکرولی فقط روی کامپیوترهای سریع پخش می‌شود؛ بقیه عکس را می‌بینند.">
        <select value={h.video.videoUrl ? 'on' : 'off'} onChange={(e) => sec('video')({ videoUrl: e.target.value === 'on' ? '/media/video/gym.mp4' : null })} className={cn(inputCls, 'h-11 cursor-pointer')}>
          <option value="on">ویدیوی قالب</option><option value="off">بدون ویدیو (فقط عکس)</option>
        </select>
      </F>
      <F label="عکس (به‌جای ویدیو)" error={err('home.video.posterUrl')}><ImagePicker prefer="site" wide value={h.video.posterUrl} onChange={(v) => sec('video')({ posterUrl: v })} /></F>
      <F label="عکس در موبایل" error={err('home.video.mobilePosterUrl')}><ImagePicker prefer="site" value={h.video.mobilePosterUrl ?? ''} onChange={(v) => sec('video')({ mobilePosterUrl: v })} hint="عمودی؛ خالی = همان عکس" /></F>
    </>,
    offer: <>
      <F label="برچسب" error={err('home.offer.eyebrow')}><Text value={h.offer.eyebrow} onChange={(v) => sec('offer')({ eyebrow: v })} /></F>
      <F label="تیتر" error={err('home.offer.title')}><Text value={h.offer.title} onChange={(v) => sec('offer')({ title: v })} max={120} /></F>
      <Cards className="sm:col-span-2" label="خدمات" items={h.offer.items} max={12} text icon href onChange={(items) => sec('offer')({ items })} errPrefix="home.offer.items" err={err} />
    </>,
    events: <>
      <F label="برچسب" error={err('home.events.eyebrow')}><Text value={h.events.eyebrow} onChange={(v) => sec('events')({ eyebrow: v })} /></F>
      <F label="تیتر" error={err('home.events.title')}><Text value={h.events.title} onChange={(v) => sec('events')({ title: v })} max={120} /></F>
      <F label="متن (وقتی جشنوارهٔ فعالی نیست)" className="sm:col-span-2" error={err('home.events.text')}><Area value={h.events.text} onChange={(v) => sec('events')({ text: v })} max={400} /></F>
      <F label="عکس اول"><ImagePicker prefer="site" value={h.events.imageUrl} onChange={(v) => sec('events')({ imageUrl: v })} /></F>
      <F label="عکس دوم"><ImagePicker prefer="site" value={h.events.secondImageUrl} onChange={(v) => sec('events')({ secondImageUrl: v })} /></F>
    </>,
    gallery: <>
      <F label="تیتر" hint={PH} error={err('home.gallery.title')} className="sm:col-span-2"><Text value={h.gallery.title} onChange={(v) => sec('gallery')({ title: v })} max={120} /></F>
      <Cards className="sm:col-span-2" label="عکس‌ها (عنوان = توضیح عکس برای نابینایان)" items={h.gallery.images} max={24} image onChange={(images) => sec('gallery')({ images })} errPrefix="home.gallery.images" err={err} />
    </>,
  }
  const simple = (k: 'branches' | 'pricing' | 'shop' | 'coaches' | 'faq' | 'contact') => {
    const v = h[k] as SimpleSection
    return <>
      <F label="برچسب" hint={PH} error={err(`home.${k}.eyebrow`)}><Text value={v.eyebrow} onChange={(x) => sec(k)({ eyebrow: x })} max={60} /></F>
      <F label="تیتر" hint="با «؛» قسمت دوم تیتر رنگی می‌شود." error={err(`home.${k}.title`)}><Text value={v.title} onChange={(x) => sec(k)({ title: x })} max={120} /></F>
      <F label="متن" className="sm:col-span-2" error={err(`home.${k}.text`)}><Area value={v.text} onChange={(x) => sec(k)({ text: x })} max={400} rows={2} /></F>
    </>
  }

  const blocks: { key: string; label: string; idx?: number }[] = [{ key: 'hero', label: 'تصویر و شعار اول صفحه (همیشه اول)' },
    ...h.sections.map((s, idx) => ({ key: s.key, label: SECTION_LABEL[s.key], idx }))]
  return (
    <>
      <Panel className="p-4 text-[13px] leading-6 text-rubber">ترتیب بخش‌ها را با فلش‌ها عوض کنید و با چشم روشن/خاموش کنید. روی هر بخش بزنید تا متن و عکس‌هایش باز شود.</Panel>
      {blocks.map((b) => {
        const s = b.idx !== undefined ? h.sections[b.idx] : null
        const body = editors[b.key] ?? (['branches', 'pricing', 'shop', 'coaches', 'faq', 'contact'].includes(b.key) ? simple(b.key as 'faq') : null)
        const isOpen = open === b.key
        const hasErr = errKeys.some((k) => k.toLowerCase().startsWith(`home.${b.key}`.toLowerCase()))
        return (
          <Panel key={b.key} className={cn('overflow-hidden', s && !s.enabled && 'opacity-60', hasErr && 'ring-2 ring-danger')}>
            <div className="flex items-center gap-2 p-3 ps-4">
              <button type="button" onClick={() => setOpen(isOpen ? '' : b.key)} aria-expanded={isOpen} className="min-w-0 flex-1 cursor-pointer text-start text-[15px] font-black text-chalk">
                {b.label}{s && !s.enabled && <span className="ms-2 text-[12px] font-bold text-rubber">(خاموش)</span>}
              </button>
              {s && <>
                <IconBtn label="بالاتر" onClick={() => move(b.idx!, -1)} disabled={b.idx === 0}><ArrowUp className="size-4" /></IconBtn>
                <IconBtn label="پایین‌تر" onClick={() => move(b.idx!, 1)} disabled={b.idx === h.sections.length - 1}><ArrowDown className="size-4" /></IconBtn>
                <IconBtn label={s.enabled ? 'خاموش کردن' : 'روشن کردن'} onClick={() => toggle(b.idx!)}>{s.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</IconBtn>
              </>}
            </div>
            {isOpen && body && <div className="grid gap-4 border-t border-steel-2 p-4 sm:grid-cols-2">{body}</div>}
          </Panel>
        )
      })}
      <Card title="فوتر و خلاصه">
        <F label="یک خط معرفی کوتاه" hint="کنار تعداد شعبه‌ها، مثل «سالن‌های جدای آقایان و بانوان»" error={err('home.footerNote')}><Text value={h.footerNote} onChange={(v) => setHome({ footerNote: v })} max={120} /></F>
      </Card>
    </>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-chalk hover:bg-steel disabled:cursor-default disabled:opacity-30">{children}</button>
}

/** فهرست کارت‌ها: عنوان + (متن، عکس، آیکن، لینک بسته به بخش) */
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
            <F label="عنوان" error={err(`${errPrefix}[${i}].title`)}><Text value={it.title} onChange={(v) => up(i, { title: v })} max={60} /></F>
            {icon && (
              <F label="آیکن">
                <select value={it.icon ?? 'dumbbell'} onChange={(e) => up(i, { icon: e.target.value })} className={cn(inputCls, 'h-11 cursor-pointer')}>
                  {Object.entries(ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </F>
            )}
            {text && <F label="توضیح" className={icon ? '' : 'sm:col-span-1'} error={err(`${errPrefix}[${i}].text`)}><Text value={it.text} onChange={(v) => up(i, { text: v })} max={200} /></F>}
            {href && (
              <F label="لینک">
                <select value={it.href ?? '#packages'} onChange={(e) => up(i, { href: e.target.value })} className={cn(inputCls, 'h-11 cursor-pointer')}>
                  {HREFS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </F>
            )}
            {image && <F label="عکس" error={err(`${errPrefix}[${i}].imageUrl`)}><ImagePicker prefer="site" value={it.imageUrl ?? ''} onChange={(v) => up(i, { imageUrl: v })} /></F>}
          </div>
          <div className="flex gap-1 sm:flex-col">
            <IconBtn label="بالاتر" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-4" /></IconBtn>
            <IconBtn label="پایین‌تر" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="size-4" /></IconBtn>
            <IconBtn label="حذف" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="size-4 text-danger" /></IconBtn>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, { title: '', icon: icon ? 'dumbbell' : null, href: href ? '#packages' : null }])}
          className="inline-flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-[3px] border-2 border-dashed border-steel-2 px-4 text-[13px] font-bold text-chalk hover:border-chalk">
          <Plus className="size-4" aria-hidden />افزودن
        </button>
      )}
    </div>
  )
}

// ================================================================ صفحه‌های قانونی
function LegalTab({ c, set, err }: { c: SiteConfig; set: SetFn; err: Err }) {
  const [doc, setDoc] = useState<keyof SiteConfig['legal']>('about')
  const DOCS: [keyof SiteConfig['legal'], string][] = [['about', 'درباره ما'], ['terms', 'قوانین و مقررات'], ['privacy', 'حریم خصوصی'], ['refund', 'لغو و بازگشت وجه']]
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
        خطی که با <b dir="ltr">##</b> شروع شود تیتر است و با <b dir="ltr">-</b> بند فهرست. هر چه بین <b dir="ltr">[[ ]]</b> باشد زرد نشان داده می‌شود تا تکمیلش کنید{todo > 0 && <> — <b className="text-[#7a5600]">{todo} جای خالی مانده</b></>}.
        متن نهایی را مشاور حقوقی تأیید کند.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <F label="متن" error={err(`legal.${doc}`)}><Area value={c.legal[doc]} onChange={(v) => set('legal', { [doc]: v })} rows={22} max={12000} /></F>
        <div className="grid content-start gap-1 text-[13px] font-bold text-chalk">پیش‌نمایش
          <article className="max-h-[560px] overflow-y-auto rounded-[6px] border border-steel-2 bg-white p-4 text-[14px] font-normal leading-7 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-[16px] [&_h2]:font-black [&_li]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-5">
            <LiteDoc text={c.legal[doc]} />
          </article>
        </div>
      </div>
    </Panel>
  )
}

// ================================================================ بخش‌های سایت (ماژول‌ها)
function ModulesTab({ c, set }: { c: SiteConfig; set: SetFn }) {
  const m = c.modules
  const rows: [keyof SiteConfig['modules'], string, string][] = [
    ['shop', 'فروشگاه آنلاین', 'صفحهٔ فروشگاه، سبد خرید و بخش فروشگاه در صفحهٔ اصلی'],
    ['canteen', 'منوی بوفه با QR', 'سفارش از روی میز با اسکن QR هر شعبه'],
    ['wallet', 'کیف پول', 'شارژ و پرداخت با کیف پول'],
    ['festival', 'جشنواره و شمارش معکوس', 'نوار بالای سایت و صفحهٔ جشنواره'],
    ['coaches', 'معرفی مربیان', 'بخش مربیان در صفحهٔ اصلی'],
    ['consultation', 'فرم مشاورهٔ رایگان', 'فرم ثبت شماره برای تماس مشاور'],
    ['cityMap', 'نقشهٔ شماتیک شعبه‌ها', 'با سه شعبه یا بیشتر، شعبه‌ها روی نقشهٔ شهر؛ خاموش = فهرست ساده'],
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

// ================================================================ بستهٔ محتوا
function PackageTab() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <Panel className="p-5">
      <h2 className="text-[17px] font-black text-chalk">خروجی کامل محتوای سایت</h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-7 text-rubber">
        یک فایل zip با شعبه‌ها، پکیج‌ها، مربیان، سؤالات، قرارداد، کالاها، منوی بوفه، همهٔ تنظیمات این صفحه و عکس‌های آپلودشده.
        هیچ اطلاعاتی از اعضا، پرداخت‌ها یا کارکنان در آن نیست. با این فایل یک نصب تازه دقیقاً با همین محتوا بالا می‌آید
        (<b dir="ltr">Setup__Mode=Content</b> و <b dir="ltr">Setup__ContentFile</b>)؛ برای پشتیبان‌گیری از محتوا هم مناسب است.
      </p>
      {err && <Notice tone="err" className="mt-3">{err}</Notice>}
      <Btn className="mt-4" busy={busy} onClick={async () => {
        setBusy(true); setErr(null)
        try { await downloadBlob(() => panelApi.exportContent(), `site-content-${new Date().toISOString().slice(0, 10)}.zip`) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
      }}><Download className="size-4" aria-hidden />دانلود بستهٔ محتوا</Btn>
    </Panel>
  )
}
