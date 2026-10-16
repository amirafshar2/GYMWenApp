import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, CameraOff, CheckCircle2, CreditCard, FileCheck2, FileX2, Search, Trash2, Watch, XCircle } from 'lucide-react'
import { panelApi, type AccessResult, type CheckInRow, type MemberRow, type MemberSummary } from '@/lib/panel'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, sectionLabel, toLatinDigits } from '@/member/ui'
import { BranchSelect, PanelTitle, usePanel } from './PanelLayout'

const REASON: Record<string, string> = {
  None: 'مجاز', UnknownCredential: 'کارت ناشناس', CredentialRevoked: 'کارت غیرفعال', NoActiveMembership: 'بدون عضویت فعال',
  WrongBranch: 'شعبهٔ دیگر', WrongSection: 'سالن دیگر', NoSessionsLeft: 'جلسات تمام شده',
}
const METHOD: Record<string, string> = { qr: 'QR', wristband: 'دستبند', card: 'کارت', external: 'سیستم گیت' }
const T = { hour: '2-digit', minute: '2-digit' } as const

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

/**
 * پیشخوان پذیرش:
 * — اسکنر USB (مثل کیبورد تایپ می‌کند و Enter می‌زند) یا دستگاه RFID رومیزی مستقیم در کادر اسکن می‌نویسد؛
 * — دوربین تبلت/گوشی با BarcodeDetector (کروم اندروید و دسکتاپ)؛
 * — تصمیم ورود همان منطق گیت است (عضویت فعال، شعبه، سالن، جلسات).
 */
export default function ReceptionPage() {
  const me = usePanel()
  const [branch, setBranch] = useState(me.branches[0]?.slug ?? '')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<AccessResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [today, setToday] = useState<CheckInRow[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const loadToday = useCallback(() => { if (branch) panelApi.today(branch).then(setToday).catch(() => null) }, [branch])
  useEffect(() => { loadToday(); const t = setInterval(loadToday, 20000); return () => clearInterval(t) }, [loadToday])

  const check = useCallback(async (raw: string | { userId: number }) => {
    const value = typeof raw === 'string' ? toLatinDigits(raw.trim()) : raw
    if (!value || !branch) return
    setBusy(true); setErr(null)
    try { setResult(typeof value === 'string' ? await panelApi.checkIn(branch, value) : await panelApi.checkInMember(branch, value.userId)); loadToday() }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false); setCode(''); scanRef.current?.focus() }
  }, [branch, loadToday])

  const submit = (e: FormEvent) => { e.preventDefault(); void check(code) }

  return (
    <>
      <PanelTitle title="پذیرش و ثبت ورود" sub="اسکنر یا دستگاه دستبند را به کامپیوتر وصل کنید؛ کافی است مکان‌نما در کادر اسکن باشد.">
        <BranchSelect value={branch} onChange={(v) => { setBranch(v); setResult(null) }} />
      </PanelTitle>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px] [&>*]:min-w-0">
        <div className="grid content-start gap-5">
          <Panel>
            <form onSubmit={submit} className="flex flex-wrap gap-2">
              <label htmlFor="scan" className="sr-only">کد QR کارت عضویت یا شمارهٔ دستبند</label>
              <input id="scan" ref={scanRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" autoComplete="off"
                placeholder="اسکن QR یا دستبند…" className={`${inputCls} min-w-[220px] flex-1 text-left font-mono`} />
              <Btn type="submit" busy={busy}>ثبت ورود</Btn>
              <CameraScan onCode={(c) => void check(c)} />
            </form>
            {err && <Notice tone="err" className="mt-4">{err}</Notice>}
            {result && (
              <div role="status" aria-live="assertive"
                className={cn('mt-4 flex items-center gap-4 rounded-[8px] p-5', result.allowed ? 'bg-[#ecf8f1] text-[#14532d]' : 'bg-[#fdecee] text-[#8a1020]')}>
                {result.allowed ? <CheckCircle2 className="size-12 shrink-0" aria-hidden /> : <XCircle className="size-12 shrink-0" aria-hidden />}
                <div>
                  <p className="text-[22px] font-black">{result.allowed ? 'ورود مجاز' : 'ورود ممنوع'}</p>
                  <p className="text-[15px]">{result.message}</p>
                  {result.allowed && <p className="mt-1 text-[13px]">
                    {result.daysLeft !== null && `${faNum(result.daysLeft)} روز تا پایان عضویت`}
                    {result.sessionsLeft !== null && ` – ${faNum(result.sessionsLeft)} جلسهٔ باقی‌مانده${result.sessionCounted ? ' (یک جلسه کم شد)' : ''}`}
                  </p>}
                </div>
              </div>
            )}
          </Panel>

          <MemberSearch onPick={setSelected} />
          {selected !== null && <MemberCardPanel key={selected} userId={selected} onClose={() => setSelected(null)} onCheckIn={(userId) => void check({ userId })} />}
        </div>

        <Panel>
          <h2 className="mb-3 flex items-center justify-between text-[17px] font-black text-chalk">ورودهای امروز
            {today && <span className="text-[13px] font-bold text-rubber">{faNum(today.filter((t) => t.allowed).length)} ورود</span>}</h2>
          {!today ? <p className="text-rubber">…</p> : today.length === 0 ? <p className="text-[14px] text-rubber">هنوز کسی وارد نشده.</p> : (
            <ul className="grid max-h-[640px] gap-1 overflow-y-auto">
              {today.map((t) => (
                <li key={t.id}>
                  <button type="button" disabled={!t.userId} onClick={() => t.userId && setSelected(t.userId)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[6px] px-2 py-2 text-right hover:bg-steel disabled:cursor-default">
                    <span className={cn('size-2.5 shrink-0 rounded-full', t.allowed ? 'bg-[#1f9d55]' : 'bg-danger')} aria-label={t.allowed ? 'مجاز' : 'رد شده'} />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-chalk">{t.memberName ?? 'ناشناس'}</span>
                    <span className="text-[12px] text-rubber">{t.allowed ? METHOD[t.method] ?? t.method : REASON[t.reason] ?? t.reason}</span>
                    <span className="w-12 text-left text-[12px] text-rubber">{jalali(t.occurredAtUtc, T)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

function CameraScan({ onCode }: { onCode: (c: string) => void }) {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const supported = typeof window !== 'undefined' && !!window.BarcodeDetector

  useEffect(() => {
    if (!on) return
    let stream: MediaStream | null = null, stop = false, last = ''
    const det = new window.BarcodeDetector!({ formats: ['qr_code'] })
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!video.current) return
        video.current.srcObject = stream
        await video.current.play()
        while (!stop) {
          const codes = await det.detect(video.current).catch(() => [])
          const v = codes[0]?.rawValue
          if (v && v !== last) { last = v; onCode(v); setTimeout(() => { last = '' }, 3000) }
          await new Promise((r) => setTimeout(r, 300))
        }
      } catch { setMsg('دسترسی به دوربین داده نشد.'); setOn(false) }
    })()
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()) }
  }, [on, onCode])

  if (!supported) return <p className="w-full text-[12px] text-rubber">اسکن با دوربین در این مرورگر پشتیبانی نمی‌شود (کروم اندروید یا دسکتاپ را امتحان کنید). اسکنر USB همیشه کار می‌کند.</p>
  return (
    <>
      <Btn type="button" variant="ghost" onClick={() => { setMsg(null); setOn(!on) }} aria-pressed={on}>
        {on ? <CameraOff className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}{on ? 'بستن دوربین' : 'دوربین'}
      </Btn>
      {on && <video ref={video} muted playsInline className="mt-2 aspect-video w-full max-w-md rounded-[8px] bg-night object-cover" />}
      {msg && <p role="alert" className="w-full text-[13px] text-danger">{msg}</p>}
    </>
  )
}

function MemberSearch({ onPick }: { onPick: (id: number) => void }) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<MemberRow[] | null>(null)
  useEffect(() => {
    if (text.trim().length < 2) { setRows(null); return }
    const t = setTimeout(() => panelApi.search(text).then(setRows).catch(() => setRows([])), 250)
    return () => clearTimeout(t)
  }, [text])
  return (
    <Panel>
      <h2 className="mb-3 text-[17px] font-black text-chalk">جست‌وجوی عضو</h2>
      <label className="relative block">
        <span className="sr-only">نام یا موبایل</span>
        <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-rubber" aria-hidden />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="نام یا ۴ رقم از موبایل…" className={`${inputCls} ps-12`} />
      </label>
      {rows && (rows.length === 0 ? <p className="mt-3 text-[14px] text-rubber">کسی پیدا نشد.</p> : (
        <ul className="mt-3 divide-y divide-steel-2">
          {rows.map((r) => (
            <li key={r.userId}>
              <button type="button" onClick={() => onPick(r.userId)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2.5 text-right hover:bg-steel">
                <span className="font-bold text-chalk">{r.fullName ?? 'بی‌نام'}</span>
                <span dir="ltr" className="text-[13px] text-rubber">{faDigits(r.phone)}</span>
                <span className={cn('ms-auto rounded-full px-2 py-0.5 text-[12px] font-bold', r.activePackage ? 'bg-[#ecf8f1] text-[#14532d]' : 'bg-steel text-rubber')}>
                  {r.activePackage ? `${r.activePackage} – ${faNum(r.daysLeft ?? 0)} روز` : 'بدون عضویت فعال'}</span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </Panel>
  )
}

function MemberCardPanel({ userId, onClose, onCheckIn }: { userId: number; onClose: () => void; onCheckIn: (userId: number) => void }) {
  const [m, setM] = useState<MemberSummary | null>(null)
  const [type, setType] = useState<'wristband' | 'card'>('wristband')
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const load = useCallback(() => panelApi.member(userId).then(setM).catch((e: Error) => setErr(e.message)), [userId])
  useEffect(() => { void load() }, [load])

  const assign = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setOk(null)
    try { await panelApi.assignCredential(userId, { type, value: toLatinDigits(value.trim()) }); setValue(''); setOk('دستبند/کارت ثبت شد و به گیت‌ها اطلاع داده شد.'); void load() }
    catch (x) { setErr((x as Error).message) }
  }
  const revoke = async (id: number) => { try { await panelApi.revokeCredential(userId, id); void load() } catch (x) { setErr((x as Error).message) } }

  if (!m) return <Panel>{err ? <Notice tone="err">{err}</Notice> : '…'}</Panel>
  const a = m.active
  return (
    <Panel aria-label="پروندهٔ عضو">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[20px] font-black text-chalk">{m.fullName ?? 'بی‌نام'}</p>
          <p dir="ltr" className="text-right text-[14px] text-rubber">{faDigits(m.phone)}</p>
        </div>
        <button type="button" onClick={onClose} className="cursor-pointer text-[13px] font-bold text-rubber hover:text-chalk">بستن</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="عضویت فعال" value={a ? `${a.packageName}` : 'ندارد'} sub={a ? `${a.branchName} – ${sectionLabel(a.section)} – تا ${jalali(a.endsAtUtc!)}` : undefined} tone={a ? 'ok' : 'err'} />
        <Info label="کیف پول" value={toman(m.walletToman)} />
        <Info label="قرارداد" value={m.hasSignedContract ? 'امضا شده' : 'امضا نشده'} icon={m.hasSignedContract ? FileCheck2 : FileX2} tone={m.hasSignedContract ? 'ok' : 'err'} />
      </div>
      {a && <Btn variant="dark" className="mt-4" onClick={() => onCheckIn(m.userId)}>ثبت ورود دستی برای این عضو</Btn>}

      <h3 className="mb-2 mt-6 text-[15px] font-black text-chalk">دستبند و کارت‌ها</h3>
      {m.credentials.filter((c) => c.isActive).length === 0 ? <p className="text-[13px] text-rubber">دستبندی ثبت نشده.</p> : (
        <ul className="grid gap-2">
          {m.credentials.filter((c) => c.isActive).map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-[6px] bg-steel px-3 py-2 text-[14px]">
              {c.type === 'card' ? <CreditCard className="size-4 text-plate" aria-hidden /> : <Watch className="size-4 text-plate" aria-hidden />}
              <span className="font-bold">{c.type === 'card' ? 'کارت' : 'دستبند'}</span>
              <span dir="ltr" className="font-mono text-rubber">…{c.valueHint}</span>
              <button type="button" onClick={() => revoke(c.id)} className="ms-auto inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-danger hover:underline"><Trash2 className="size-4" aria-hidden />پس گرفتن</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={assign} className="mt-3 flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as 'wristband' | 'card')} aria-label="نوع" className={`${inputCls} h-11 w-auto cursor-pointer`}>
          <option value="wristband">دستبند</option><option value="card">کارت</option>
        </select>
        <label htmlFor="cred" className="sr-only">شمارهٔ دستبند</label>
        <input id="cred" value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="دستبند را روی دستگاه بزنید…" className={`${inputCls} h-11 min-w-[200px] flex-1 font-mono`} />
        <Btn type="submit" className="h-11" disabled={value.trim().length < 4}>ثبت دستبند</Btn>
      </form>
      {err && <Notice tone="err" className="mt-3">{err}</Notice>}
      {ok && <Notice tone="ok" className="mt-3">{ok}</Notice>}

      {m.recentCheckIns.length > 0 && <>
        <h3 className="mb-2 mt-6 text-[15px] font-black text-chalk">آخرین ورودها</h3>
        <ul className="grid gap-1 text-[13px]">
          {m.recentCheckIns.slice(0, 6).map((c) => (
            <li key={c.id} className="flex gap-2"><span className={c.allowed ? 'text-[#1f7a46]' : 'text-danger'}>{c.allowed ? '✓' : '✕'}</span>
              <span>{jalali(c.occurredAtUtc, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-rubber">{c.branchName}</span></li>
          ))}
        </ul>
      </>}
    </Panel>
  )
}

function Info({ label, value, sub, tone, icon: Icon }: { label: string; value: string; sub?: string; tone?: 'ok' | 'err'; icon?: typeof Watch }) {
  return (
    <div className="rounded-[6px] bg-steel p-3">
      <p className="text-[12px] text-rubber">{label}</p>
      <p className={cn('flex items-center gap-1 text-[15px] font-black', tone === 'ok' ? 'text-[#1f7a46]' : tone === 'err' ? 'text-danger' : 'text-chalk')}>{Icon && <Icon className="size-4" aria-hidden />}{value}</p>
      {sub && <p className="text-[12px] text-rubber">{sub}</p>}
    </div>
  )
}
