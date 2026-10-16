import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronLeft, CreditCard, LocateFixed, MapPin, ShieldCheck, TicketPercent } from 'lucide-react'
import { api, ApiError, memberApi, submitToGateway, type Branch, type Contract, type Pkg, type Profile, type Quote, type Section } from '@/lib/api'
import { setUser, useAuth } from '@/lib/auth'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { distanceKm, faDigits, faNum, formatDistance, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import OtpLogin, { CodeField, useCountdown } from '@/member/OtpLogin'
import { Btn, inputCls, Notice, PageShell, Panel, sectionLabel } from '@/member/ui'

type Step = 'branch' | 'package' | 'account' | 'contract' | 'pay'
const STEPS: { key: Step; label: string }[] = [
  { key: 'branch', label: 'شعبه' }, { key: 'package', label: 'پکیج' }, { key: 'account', label: 'ورود' },
  { key: 'contract', label: 'قرارداد' }, { key: 'pay', label: 'پرداخت' },
]

type Draft = { section?: Section; branch?: string; pkg?: string; code?: string }
const KEY = 'kg-join'
const load = (): Draft => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Draft } catch { return {} } }
const save = (d: Draft) => { try { sessionStorage.setItem(KEY, JSON.stringify(d)) } catch { /* حالت خصوصی */ } }
export const clearJoinDraft = () => { try { sessionStorage.removeItem(KEY) } catch { /* */ } }

/** ثبت‌نام آنلاین: سالن و شعبه ← پکیج و کد تخفیف ← ورود ← قرارداد و فرم سلامت ← پرداخت */
export default function JoinPage() {
  const [params] = useSearchParams()
  const { ready, user } = useAuth()
  const { data: branches = [] } = useData('branches', api.branches)
  const { data: pkgs = [] } = useData('packages', api.packages)

  const [draft, setDraft] = useState<Draft>(() => {
    const d = load()
    const p = params.get('package'), b = params.get('branch'), s = params.get('section')
    if (p) d.pkg = p
    if (b) d.branch = b
    if (s === 'men' || s === 'women') d.section = s
    if (!d.pkg) { try { d.pkg = sessionStorage.getItem('chosen-package') ?? undefined } catch { /* */ } }
    return d
  })
  const set = (patch: Partial<Draft>) => setDraft((d) => { const n = { ...d, ...patch }; save(n); return n })

  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    if (!user) { setProfile(null); return }
    memberApi.profile().then(setProfile).catch(() => setProfile(null))
  }, [user])

  // اولین مرحلهٔ ناقص
  const firstOpen = (): Step => {
    if (!draft.section || !draft.branch) return 'branch'
    if (!draft.pkg) return 'package'
    if (!user) return 'account'
    if (!profile?.hasSignedLatestContract || !user.fullName) return 'contract'
    return 'pay'
  }
  const [step, setStep] = useState<Step>('branch')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!ready || touched) return
    if (user && !profile) return
    setStep(firstOpen())
  }, [ready, user, profile, branches.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (s: Step) => { setTouched(true); setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  useEffect(() => { document.title = `ثبت‌نام آنلاین | ${brand.name}` }, [])

  // پارامتر نامعتبر در آدرس (پکیج/شعبهٔ حذف‌شده) نادیده گرفته شود
  useEffect(() => {
    if (pkgs.length && draft.pkg && !pkgs.some((p) => p.slug === draft.pkg)) set({ pkg: undefined })
    if (branches.length && draft.branch && !branches.some((b) => b.slug === draft.branch)) set({ branch: undefined })
  }, [pkgs.length, branches.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const branch = branches.find((b) => b.slug === draft.branch)
  const pkg = pkgs.find((p) => p.slug === draft.pkg)

  // پیش‌فاکتور زنده (تخفیف جشنواره + کد)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteErr, setQuoteErr] = useState<string | null>(null)
  useEffect(() => {
    if (!draft.branch || !draft.pkg || !draft.section) { setQuote(null); return }
    let alive = true
    const t = setTimeout(() => {
      memberApi.quote({ branchSlug: draft.branch!, packageSlug: draft.pkg!, section: draft.section!, discountCode: draft.code?.trim() || null })
        .then((q) => { if (alive) { setQuote(q); setQuoteErr(null) } })
        .catch((e: ApiError) => { if (alive) { setQuote(null); setQuoteErr(Object.values(e.errors)[0]?.[0] ?? e.message) } })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [draft.branch, draft.pkg, draft.section, draft.code])

  const idx = STEPS.findIndex((s) => s.key === step)
  const done = (s: Step) => {
    switch (s) {
      case 'branch': return !!(draft.section && draft.branch)
      case 'package': return !!draft.pkg
      case 'account': return !!user
      case 'contract': return !!(profile?.hasSignedLatestContract && user?.fullName)
      default: return false
    }
  }

  return (
    <PageShell eyebrow="ثبت‌نام آنلاین" title="عضویت در چند دقیقه">
      <Stepper current={idx} done={done} onGo={(s) => go(s)} />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <Animated k={step}>
          {step === 'branch' && <BranchStep branches={branches} draft={draft} set={set} onNext={() => go('package')} />}
          {step === 'package' && <PackageStep pkgs={pkgs} draft={draft} set={set} quoteErr={quoteErr} quote={quote}
            onBack={() => go('branch')} onNext={() => go(user ? (done('contract') ? 'pay' : 'contract') : 'account')} />}
          {step === 'account' && (
            <Panel aria-labelledby="acc-t">
              <h2 id="acc-t" className="mb-1 text-[20px] font-black text-chalk">ورود یا ساخت حساب</h2>
              <p className="mb-6 text-[14px] text-rubber">برای ثبت قرارداد و صدور فاکتور به نام شما، با موبایل وارد شوید.</p>
              {user ? (
                <div className="grid gap-4">
                  <Notice tone="ok">با شمارهٔ {user.phoneNumber} وارد شده‌اید.</Notice>
                  <Btn onClick={() => go(done('contract') ? 'pay' : 'contract')}>ادامه<ChevronLeft className="size-4" aria-hidden /></Btn>
                </div>
              ) : <OtpLogin onDone={() => setTouched(false)} />}
            </Panel>
          )}
          {step === 'contract' && user && (
            <ContractStep section={draft.section ?? 'men'} defaultName={user.fullName ?? ''}
              alreadySigned={!!profile?.hasSignedLatestContract}
              onBack={() => go('package')}
              onSigned={async () => { const p = await memberApi.profile(); setProfile(p); setUser(p.user); go('pay') }} />
          )}
          {step === 'pay' && (
            <PayStep draft={draft} quote={quote} onBack={() => go('contract')} onNeedContract={() => go('contract')} />
          )}
        </Animated>
        <Summary branch={branch} pkg={pkg} section={draft.section} quote={quote} />
      </div>
    </PageShell>
  )
}

function Animated({ k, children }: { k: string; children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={k} initial={reduced ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: 24 }} transition={{ duration: 0.25 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function Stepper({ current, done, onGo }: { current: number; done: (s: Step) => boolean; onGo: (s: Step) => void }) {
  return (
    <nav aria-label="مراحل ثبت‌نام">
      <ol className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-3">
        {STEPS.map((s, i) => {
          const reachable = i <= current || STEPS.slice(0, i).every((x) => done(x.key))
          const ok = done(s.key) && i !== current
          return (
            <li key={s.key} className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <button type="button" disabled={!reachable} onClick={() => onGo(s.key)} aria-current={i === current ? 'step' : undefined}
                className={cn('flex cursor-pointer items-center gap-2 rounded-full py-1.5 pe-3 ps-1.5 text-[14px] font-bold transition-colors disabled:cursor-default',
                  i === current ? 'bg-chalk text-white' : ok ? 'bg-white text-chalk hover:bg-steel-2' : 'bg-white text-rubber')}>
                <span className={cn('grid size-7 place-items-center rounded-full text-[13px]',
                  i === current ? 'bg-plate text-white' : ok ? 'bg-[#1f9d55] text-white' : 'bg-steel text-rubber')}>
                  {ok ? <Check className="size-4" aria-hidden /> : faNum(i + 1)}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-steel-2 sm:w-8" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ---------------- ۱. سالن و شعبه ----------------
function BranchStep({ branches, draft, set, onNext }: { branches: Branch[]; draft: Draft; set: (p: Partial<Draft>) => void; onNext: () => void }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const list = useMemo(() => {
    const f = branches.filter((b) => !draft.section || (draft.section === 'men' ? b.hasMen : b.hasWomen))
    if (!pos) return f.map((b) => ({ b, d: null as number | null }))
    return f.map((b) => ({ b, d: distanceKm(pos, { lat: b.latitude, lng: b.longitude }) })).sort((x, y) => x.d! - y.d!)
  }, [branches, draft.section, pos])

  const locate = () => {
    if (!navigator.geolocation) return setGeoMsg('مرورگر شما موقعیت‌یابی ندارد.')
    setGeoMsg('در حال پیدا کردن موقعیت…')
    navigator.geolocation.getCurrentPosition(
      (p) => { const me = { lat: p.coords.latitude, lng: p.coords.longitude }; setPos(me); setGeoMsg(null) },
      () => setGeoMsg('اجازهٔ موقعیت داده نشد؛ شعبه را از فهرست انتخاب کنید.'), { timeout: 8000 })
  }
  useEffect(() => { if (pos && list[0] && !draft.branch) set({ branch: list[0].b.slug }) }, [pos]) // eslint-disable-line react-hooks/exhaustive-deps
  // اگر شعبهٔ قبلی سالن انتخاب‌شده را ندارد، پاک شود
  useEffect(() => { if (draft.branch && branches.length && !list.some((x) => x.b.slug === draft.branch)) set({ branch: undefined }) }, [draft.section, branches.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Panel aria-labelledby="br-t">
      <h2 id="br-t" className="mb-5 text-[20px] font-black text-chalk">سالن و شعبه</h2>
      <fieldset>
        <legend className="mb-3 text-[14px] font-bold text-chalk">کدام سالن؟</legend>
        <div className="grid grid-cols-2 gap-3">
          {(['men', 'women'] as const).map((s) => (
            <label key={s} className={cn('flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-[3px] border-2 text-[16px] font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plate/40',
              draft.section === s ? (s === 'women' ? 'border-women bg-women/5 text-women' : 'border-chalk bg-steel text-chalk') : 'border-steel-2 text-rubber hover:border-chalk/40')}>
              <input type="radio" name="section" value={s} checked={draft.section === s} onChange={() => set({ section: s })} className="sr-only" />
              {sectionLabel(s)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7" disabled={!draft.section}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-[14px] font-bold text-chalk">شعبه</legend>
          <button type="button" onClick={locate} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold text-plate hover:underline disabled:opacity-50" disabled={!draft.section}>
            <LocateFixed className="size-4" aria-hidden />نزدیک‌ترین شعبه به من
          </button>
        </div>
        {geoMsg && <p role="status" className="mb-3 text-[13px] text-rubber">{geoMsg}</p>}
        {!draft.section ? <p className="rounded-[3px] bg-steel px-4 py-6 text-center text-[14px] text-rubber">اول سالن را انتخاب کنید.</p> : (
          <div className="grid max-h-[440px] gap-2 overflow-y-auto pe-1">
            {list.map(({ b, d }, i) => (
              <label key={b.slug} className={cn('flex cursor-pointer items-start gap-3 rounded-[3px] border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plate/40',
                draft.branch === b.slug ? 'border-plate bg-[#f2f7fd]' : 'border-steel-2 hover:border-chalk/30')}>
                <input type="radio" name="branch" value={b.slug} checked={draft.branch === b.slug} onChange={() => set({ branch: b.slug })} className="mt-1 accent-[var(--color-plate)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-chalk">
                    {b.name}
                    {pos && i === 0 && <span className="rounded-full bg-plate px-2 py-0.5 text-[11px] text-white">نزدیک‌ترین</span>}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-[13px] text-rubber"><MapPin className="size-3.5 shrink-0" aria-hidden />{b.district}{d !== null && <> · {formatDistance(d)}</>}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="mt-7 flex justify-end">
        <Btn onClick={onNext} disabled={!draft.section || !draft.branch}>ادامه: انتخاب پکیج<ChevronLeft className="size-4" aria-hidden /></Btn>
      </div>
    </Panel>
  )
}

// ---------------- ۲. پکیج و کد تخفیف ----------------
function PackageStep({ pkgs, draft, set, quote, quoteErr, onBack, onNext }: {
  pkgs: Pkg[]; draft: Draft; set: (p: Partial<Draft>) => void; quote: Quote | null; quoteErr: string | null; onBack: () => void; onNext: () => void
}) {
  const uid = useId()
  const [code, setCode] = useState(draft.code ?? '')
  const apply = (e: FormEvent) => { e.preventDefault(); set({ code: code.trim().toUpperCase() || undefined }) }
  const codeMsg = draft.code ? (quote?.discountCodeError ?? (quote?.discountCodePercent ? `کد ${draft.code} اعمال شد: ${faNum(quote.discountCodePercent)}٪ تخفیف` : null)) : null

  return (
    <Panel aria-labelledby="pk-t">
      <h2 id="pk-t" className="mb-5 text-[20px] font-black text-chalk">پکیج عضویت</h2>
      <fieldset>
        <legend className="sr-only">پکیج</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {pkgs.map((p) => {
            const price = p.discountedPriceToman ?? p.priceToman
            return (
              <label key={p.slug} className={cn('relative flex cursor-pointer flex-col gap-1 rounded-[3px] border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plate/40',
                draft.pkg === p.slug ? 'border-plate bg-[#f2f7fd]' : 'border-steel-2 hover:border-chalk/30')}>
                <input type="radio" name="pkg" value={p.slug} checked={draft.pkg === p.slug} onChange={() => set({ pkg: p.slug })} className="sr-only" />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[16px] font-bold text-chalk">{p.name}</span>
                  {p.discountPercent ? <span className="rounded-full bg-plate/10 px-2 py-0.5 text-[11px] font-bold text-plate">{faNum(p.discountPercent)}٪ جشنواره</span> : null}
                </span>
                <span className="text-[13px] text-rubber">{faNum(p.durationMonths)} ماه · {p.sessions ? `${faNum(p.sessions)} جلسه` : 'نامحدود'}</span>
                <span className="mt-1 text-[15px] font-black text-chalk">
                  {p.discountedPriceToman && <s className="me-2 text-[12px] font-normal text-rubber">{faNum(p.priceToman)}</s>}
                  {toman(price)}
                </span>
                {draft.pkg === p.slug && <Check className="absolute bottom-4 left-4 size-5 text-plate" aria-hidden />}
              </label>
            )
          })}
        </div>
      </fieldset>

      <form onSubmit={apply} className="mt-7 grid gap-2">
        <label htmlFor={`${uid}-code`} className="flex items-center gap-1.5 text-[14px] font-bold text-chalk"><TicketPercent className="size-4" aria-hidden />کد تخفیف (اختیاری)</label>
        <div className="flex gap-2">
          <input id={`${uid}-code`} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" placeholder="KHASHAYAR10" autoComplete="off"
            aria-describedby={`${uid}-cm`} aria-invalid={!!quote?.discountCodeError || undefined} className={`${inputCls} text-left uppercase`} />
          <Btn type="submit" variant="dark" className="shrink-0">اعمال</Btn>
        </div>
        <p id={`${uid}-cm`} role="status" className={cn('min-h-6 text-[13px]', quote?.discountCodeError ? 'text-danger' : 'text-[#1f7a46]')}>{codeMsg}</p>
      </form>
      {quoteErr && <Notice tone="err">{quoteErr}</Notice>}

      <div className="mt-5 flex justify-between gap-3">
        <Btn variant="ghost" onClick={onBack}>بازگشت</Btn>
        <Btn onClick={onNext} disabled={!draft.pkg || !!quoteErr}>ادامه<ChevronLeft className="size-4" aria-hidden /></Btn>
      </div>
    </Panel>
  )
}

// ---------------- ۴. قرارداد، فرم سلامت و امضا با کد ----------------
function ContractStep({ section, defaultName, alreadySigned, onBack, onSigned }: {
  section: Section; defaultName: string; alreadySigned: boolean; onBack: () => void; onSigned: () => Promise<void>
}) {
  const uid = useId()
  const [contract, setContract] = useState<Contract | null>(null)
  const [name, setName] = useState(defaultName)
  const [answers, setAnswers] = useState<(boolean | null)[]>([])
  const [notes, setNotes] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [phase, setPhase] = useState<'form' | 'code'>('form')
  const [code, setCode] = useState('')
  const [demo, setDemo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [left, setLeft] = useCountdown()

  useEffect(() => {
    memberApi.contract().then((c) => { setContract(c); setAnswers(c.healthQuestions.map(() => null)) }).catch((e: Error) => setErr(e.message))
  }, [])

  const gender = section === 'women' ? 'female' : 'male'
  const anyYes = answers.some((a) => a === true)

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault()
    if (name.trim().split(/\s+/).length < 2) return setErr('نام و نام خانوادگی را کامل بنویسید.')
    if (answers.some((a) => a === null)) return setErr('به همهٔ پرسش‌های فرم سلامت پاسخ دهید.')
    if (!accepted) return setErr('برای ادامه، متن قرارداد را بپذیرید.')
    setBusy(true); setErr(null)
    try {
      setUser(await memberApi.updateMe(name.trim(), gender))
      const r = await memberApi.signOtp()
      setDemo(r.demoCode); setLeft(r.resendInSeconds); setPhase('code'); setCode('')
    } catch (x) { setErr((x as Error).message) }
    finally { setBusy(false) }
  }

  const sign = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!contract || code.length !== 5) return
    setBusy(true); setErr(null)
    try {
      await memberApi.sign({ version: contract.version, fullName: name.trim(), accepted, healthAnswers: answers.map(Boolean), healthNotes: notes.trim() || null, code })
      await onSigned()
    } catch (x) { setErr((x as ApiError).field?.('code') ?? (x as Error).message) }
    finally { setBusy(false) }
  }
  useEffect(() => { if (phase === 'code' && code.length === 5 && !busy) void sign() }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!contract) return <Panel>{err ? <Notice tone="err">{err}</Notice> : <p className="text-rubber">در حال بارگذاری قرارداد…</p>}</Panel>

  return (
    <Panel aria-labelledby="ct-t">
      <h2 id="ct-t" className="mb-1 text-[20px] font-black text-chalk">{contract.title}</h2>
      <p className="mb-5 text-[13px] text-rubber">نسخهٔ {faNum(contract.version)} · امضا با کد پیامکی؛ نسخهٔ PDF در پروفایل شما می‌ماند.</p>
      {alreadySigned && <Notice tone="ok" className="mb-5">این نسخه را قبلاً امضا کرده‌اید. اگر نام را عوض کرده‌اید، دوباره امضا کنید؛ وگرنه مستقیم به پرداخت بروید.</Notice>}

      {phase === 'form' ? (
        <form onSubmit={requestCode} noValidate className="grid gap-6">
          <div className="grid gap-2">
            <label htmlFor={`${uid}-n`} className="text-[14px] font-bold text-chalk">نام و نام خانوادگی (مطابق کارت ملی)</label>
            <input id={`${uid}-n`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} />
            <p className="text-[13px] text-rubber">سالن انتخابی: {sectionLabel(section)}</p>
          </div>

          <div>
            <h3 className="mb-2 text-[15px] font-bold text-chalk">بندهای قرارداد</h3>
            <ol tabIndex={0} aria-label="متن قرارداد" className="max-h-[300px] list-inside list-decimal space-y-3 overflow-y-auto rounded-[3px] border border-steel-2 bg-steel/60 p-4 text-[14px] leading-7 text-chalk focus:outline-2 focus:outline-plate">
              {contract.clauses.map((c, i) => <li key={i}>{c}</li>)}
            </ol>
          </div>

          <fieldset>
            <legend className="mb-2 text-[15px] font-bold text-chalk">فرم سلامت پیش از ورزش (PAR-Q)</legend>
            <ul className="divide-y divide-steel-2 rounded-[3px] border border-steel-2">
              {contract.healthQuestions.map((q, i) => (
                <li key={i} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span id={`${uid}-q${i}`} className="text-[14px] leading-7 text-chalk">{q}</span>
                  <span role="radiogroup" aria-labelledby={`${uid}-q${i}`} className="flex shrink-0 gap-2">
                    {[false, true].map((v) => (
                      <label key={String(v)} className={cn('cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plate/40',
                        answers[i] === v ? (v ? 'border-plate bg-plate text-white' : 'border-chalk bg-chalk text-white') : 'border-steel-2 text-rubber hover:border-chalk/40')}>
                        <input type="radio" name={`${uid}-q${i}`} className="sr-only" checked={answers[i] === v}
                          onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} />
                        {v ? 'بله' : 'خیر'}
                      </label>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {anyYes && (
              <div className="mt-3 grid gap-2">
                <Notice tone="warn">به یکی از پرسش‌ها «بله» داده‌اید. عضویت انجام می‌شود، ولی لطفاً پیش از شروع تمرین تأییدیهٔ پزشک را به پذیرش شعبه تحویل دهید.</Notice>
                <label htmlFor={`${uid}-notes`} className="text-[13px] font-bold text-chalk">توضیح (اختیاری)</label>
                <textarea id={`${uid}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2}
                  className={`${inputCls} h-auto py-3`} />
              </div>
            )}
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-7 text-chalk">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1.5 size-4 accent-[var(--color-plate)]" />
            متن قرارداد را خواندم و می‌پذیرم و پاسخ‌های فرم سلامت درست است.
          </label>

          {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <Btn type="button" variant="ghost" onClick={onBack}>بازگشت</Btn>
            <div className="flex flex-wrap gap-3">
              {alreadySigned && <Btn type="button" variant="dark" onClick={() => void onSigned()}>رفتن به پرداخت</Btn>}
              <Btn type="submit" busy={busy}><ShieldCheck className="size-5" aria-hidden />دریافت کد امضا</Btn>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={sign} noValidate className="grid gap-4">
          <label htmlFor={`${uid}-sc`} className="text-[14px] font-bold text-chalk">کد امضای قرارداد را وارد کنید</label>
          <CodeField id={`${uid}-sc`} value={code} onChange={setCode} invalid={!!err} />
          {demo && <Notice tone="warn"><b>حالت نمایشی:</b> کد امضا: <b dir="ltr" className="text-[17px] tracking-widest">{faDigits(demo)}</b></Notice>}
          {err && <p role="alert" className="text-[14px] text-danger">{err}</p>}
          <Btn type="submit" busy={busy}>امضا و ادامه</Btn>
          <p className="text-center text-[13px] text-rubber">
            {left > 0 ? <>ارسال دوباره تا {faNum(left)} ثانیه</> :
              <button type="button" onClick={() => void requestCode()} className="cursor-pointer font-bold text-plate hover:underline">ارسال دوبارهٔ کد</button>}
            {' · '}
            <button type="button" onClick={() => setPhase('form')} className="cursor-pointer font-bold text-chalk hover:underline">ویرایش فرم</button>
          </p>
        </form>
      )}
    </Panel>
  )
}

// ---------------- ۵. پرداخت ----------------
function PayStep({ draft, quote, onBack, onNeedContract }: { draft: Draft; quote: Quote | null; onBack: () => void; onNeedContract: () => void }) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const pay = async () => {
    if (!draft.branch || !draft.pkg || !draft.section) return
    setBusy(true); setErr(null)
    try {
      const g = await memberApi.checkout({
        branchSlug: draft.branch, packageSlug: draft.pkg, section: draft.section,
        discountCode: draft.code ?? null, idempotencyKey: crypto.randomUUID().replace(/-/g, ''),
      })
      if (g.alreadyPaid) return nav(`/join/result?id=${g.paymentId}`)
      submitToGateway(g) // صفحه به درگاه می‌رود
    } catch (x) {
      const e = x as ApiError
      if (e.field?.('contract') || e.field?.('fullName')) { onNeedContract(); return }
      setErr(Object.values(e.errors ?? {})[0]?.[0] ?? e.message)
      setBusy(false)
    }
  }

  return (
    <Panel aria-labelledby="pay-t">
      <h2 id="pay-t" className="mb-1 text-[20px] font-black text-chalk">پرداخت آنلاین</h2>
      <p className="mb-6 text-[14px] text-rubber">پرداخت از طریق درگاه شاپرکی انجام می‌شود. بعد از پرداخت، عضویت فوری فعال و فاکتور صادر می‌شود.</p>
      <Notice tone="info" className="mb-6">
        <b>نسخهٔ نمایشی:</b> به‌جای بانک، درگاه آزمایشی باز می‌شود و پولی کسر نمی‌شود. «Pay» یعنی پرداخت موفق و «Cancel» یعنی انصراف.
      </Notice>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      <div className="flex flex-wrap justify-between gap-3">
        <Btn variant="ghost" onClick={onBack} disabled={busy}>بازگشت</Btn>
        <Btn onClick={pay} busy={busy} disabled={!quote} className="min-w-[240px]">
          <CreditCard className="size-5" aria-hidden />
          {quote ? `پرداخت ${toman(quote.totalToman)}` : 'در حال محاسبهٔ مبلغ…'}
        </Btn>
      </div>
    </Panel>
  )
}

// ---------------- خلاصهٔ سفارش ----------------
function Summary({ branch, pkg, section, quote }: { branch?: Branch; pkg?: Pkg; section?: Section; quote: Quote | null }) {
  const row = (k: string, v: ReactNode, cls = '') => (
    <div className={cn('flex items-baseline justify-between gap-3 py-2 text-[14px]', cls)}><dt className="text-rubber">{k}</dt><dd className="text-left font-bold text-chalk">{v}</dd></div>
  )
  return (
    <aside aria-label="خلاصهٔ سفارش" className="lg:sticky lg:top-[100px]">
      <Panel className="bg-white">
        <h2 className="mb-3 text-[17px] font-black text-chalk">خلاصهٔ سفارش</h2>
        <dl className="divide-y divide-steel-2">
          {row('سالن', section ? sectionLabel(section) : '—')}
          {row('شعبه', branch?.name ?? '—')}
          {row('پکیج', pkg?.name ?? '—')}
          {quote && <>
            {row('قیمت پکیج', toman(quote.baseAmountToman))}
            {quote.campaignDiscountToman > 0 && row(quote.campaignTitle ?? 'تخفیف جشنواره', `− ${toman(quote.campaignDiscountToman)}`, '[&_dd]:text-plate')}
            {quote.codeDiscountToman > 0 && row(`کد ${quote.discountCode}`, `− ${toman(quote.codeDiscountToman)}`, '[&_dd]:text-plate')}
          </>}
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t-2 border-chalk pt-3">
          <span className="text-[15px] font-bold text-chalk">مبلغ نهایی</span>
          <span className="text-[22px] font-black text-chalk">{quote ? toman(quote.totalToman) : '—'}</span>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-6 text-rubber">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />مبلغ نهایی سمت سرور محاسبه و پس از بازگشت از بانک دوباره بررسی می‌شود.
        </p>
      </Panel>
    </aside>
  )
}
