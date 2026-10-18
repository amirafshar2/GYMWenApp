import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, Circle, PartyPopper, Rocket, Sparkles, X } from 'lucide-react'
import { panelApi, type SetupStatus, type SetupStep } from '@/lib/panel'
import { reloadSite } from '@/lib/site'
import { faNum } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, Notice, Panel, Spinner } from '@/member/ui'
import { PanelTitle } from './PanelLayout'

// ---------------- وضعیت مشترک دستیار (یک بار خوانده می‌شود، بعد از هر تغییر تازه می‌شود)
let status: SetupStatus | null = null
const subs = new Set<() => void>()
const emit = (s: SetupStatus) => { status = s; subs.forEach((f) => f()) }
export const refreshSetup = () => panelApi.setup().then(emit).catch(() => {})
const useSetup = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => status)

const pathOf = (link: string) => link.split('?')[0]
const nextStep = (s: SetupStatus) => s.steps.find((x) => !x.done && !x.optional && x.key !== 'publish') ?? s.steps.find((x) => !x.done && x.key !== 'publish') ?? s.steps.find((x) => x.key === 'publish' && !x.done)

/**
 * دستیار شناور برای مدیر کل: تا وقتی سایت منتشر نشده (یا مرحله‌ای جا مانده) گوشهٔ پنل می‌ماند،
 * مرحلهٔ بعد را نشان می‌دهد و با یک کلیک به همان صفحه می‌برد. روی صفحهٔ هر مرحله، راهنمای همان مرحله بالای صفحه است.
 */
export function SetupGuide() {
  const s = useSetup()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(true)
  useEffect(() => { void refreshSetup() }, [pathname])
  if (!s || s.guideHidden || pathname === '/panel/setup') return null
  const allDone = s.published && s.steps.every((x) => x.done || x.optional)
  if (allDone) return null
  const step = nextStep(s)
  const here = s.steps.find((x) => !x.done && pathOf(x.link) === pathname && (!x.link.includes('?') || search.includes(x.link.split('?')[1])))
  const pct = Math.round((s.doneCount / Math.max(1, s.requiredCount)) * 100)

  return (
    <>
      {here && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[8px] border-2 border-plate/30 bg-plate/[.06] p-4">
          <Sparkles className="size-5 shrink-0 text-plate" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-black text-chalk">مرحلهٔ «{here.title}»</p>
            <p className="text-[13px] leading-6 text-rubber">{here.hint}</p>
          </div>
          <ManualDone step={here} />
        </div>
      )}
      <div className={cn('fixed left-4 z-[60] w-[min(340px,calc(100vw-2rem))]', pathname.startsWith('/panel/site') ? 'bottom-24' : 'bottom-4')}>
        {open ? (
          <div role="complementary" aria-label="دستیار راه‌اندازی" className="overflow-hidden rounded-[10px] border border-steel-2 bg-white shadow-[0_12px_40px_rgb(0_0_0/.15)]">
            <div className="flex items-center gap-2 bg-chalk px-4 py-3 text-white">
              <Rocket className="size-4" aria-hidden />
              <p className="flex-1 text-[14px] font-black">راه‌اندازی سایت</p>
              <span className="text-[12px] text-white/70">{faNum(s.doneCount)} از {faNum(s.requiredCount)}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="کوچک کردن" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
            </div>
            <div className="h-1.5 bg-steel"><div className="h-full bg-plate transition-all" style={{ width: `${pct}%` }} /></div>
            {step && (
              <div className="p-4">
                <p className="text-[12px] font-bold text-rubber">قدم بعدی</p>
                <p className="mt-0.5 text-[16px] font-black text-chalk">{step.title}</p>
                <p className="mt-1 text-[13px] leading-6 text-rubber">{step.hint}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link to={step.link} className="inline-flex h-10 items-center gap-1 rounded-[3px] bg-plate px-4 text-[14px] font-bold text-white hover:bg-plate-hi">برو به این مرحله<ChevronLeft className="size-4" aria-hidden /></Link>
                  <Link to="/panel/setup" className="text-[13px] font-bold text-rubber hover:text-chalk">همهٔ مرحله‌ها</Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-chalk px-4 text-[14px] font-bold text-white shadow-lg">
            <Rocket className="size-4" aria-hidden />راه‌اندازی: {faNum(s.doneCount)} از {faNum(s.requiredCount)}
          </button>
        )}
      </div>
    </>
  )
}

/** مرحله‌هایی که از داده معلوم نمی‌شوند (رنگ، متن صفحهٔ اصلی) را مالک خودش «انجام شد» می‌زند */
function ManualDone({ step }: { step: SetupStep }) {
  const [busy, setBusy] = useState(false)
  if (!['theme', 'home', 'staff', 'coaches', 'legal'].includes(step.key)) return null
  return (
    <Btn variant="ghost" className="h-10" busy={busy} onClick={async () => {
      setBusy(true)
      try { emit(await panelApi.updateSetup({ step: step.key, stepDone: true })) } finally { setBusy(false) }
    }}><Check className="size-4" aria-hidden />این مرحله انجام شد</Btn>
  )
}

/** صفحهٔ کامل دستیار: همهٔ مرحله‌ها، انتشار سایت */
export default function SetupPage() {
  const s = useSetup()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { void refreshSetup() }, [])
  if (!s) return <Spinner />
  const ready = s.steps.every((x) => x.done || x.optional || x.key === 'publish' || x.key === 'legal')

  const publish = async (on: boolean) => {
    setBusy(true); setErr(null)
    try { emit(await panelApi.updateSetup({ publish: on })); await reloadSite() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const toggle = async (st: SetupStep) => { emit(await panelApi.updateSetup({ step: st.key, stepDone: !st.done })) }

  return (
    <>
      <PanelTitle title="دستیار راه‌اندازی" sub="قدم‌به‌قدم سایت را کامل کنید؛ هر مرحله یک دکمه دارد که مستقیم به همان صفحه می‌برد." />
      <Panel className="mb-5 flex flex-wrap items-center gap-4 p-5">
        <div className={cn('grid size-14 place-items-center rounded-full', s.published ? 'bg-[#e3f5ea] text-[#1f7a46]' : 'bg-sun/25 text-[#7a5600]')}>
          {s.published ? <PartyPopper className="size-7" aria-hidden /> : <Rocket className="size-7" aria-hidden />}
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="text-[18px] font-black text-chalk">{s.published ? 'سایت منتشر شده و برای همه باز است' : 'سایت هنوز منتشر نشده'}</p>
          <p className="text-[14px] text-rubber">
            {s.published ? 'هر تغییری در پنل همان لحظه روی سایت دیده می‌شود.' : 'بازدیدکننده‌ها فعلاً صفحهٔ «در حال راه‌اندازی» را می‌بینند؛ شما و کارکنان سایت کامل را می‌بینید.'}
            {' '}{faNum(s.doneCount)} از {faNum(s.requiredCount)} مرحلهٔ لازم انجام شده.
          </p>
        </div>
        {s.published
          ? <Btn variant="ghost" busy={busy} onClick={() => publish(false)}>برگرداندن به «در حال راه‌اندازی»</Btn>
          : <Btn busy={busy} disabled={!ready} onClick={() => publish(true)}><Rocket className="size-4" aria-hidden />انتشار سایت</Btn>}
      </Panel>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}

      <ol className="grid gap-2">
        {s.steps.filter((x) => x.key !== 'publish').map((st, i) => (
          <li key={st.key}>
            <Panel className={cn('flex flex-wrap items-center gap-3 p-4', st.done && 'bg-[#f6fbf8]')}>
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-black', st.done ? 'bg-[#1f9d55] text-white' : 'bg-steel text-rubber')}>
                {st.done ? <Check className="size-5" aria-hidden /> : faNum(i + 1)}
              </span>
              <div className="min-w-[200px] flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-black text-chalk">{st.title}
                  {st.optional && <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] font-bold text-rubber">اختیاری</span>}</p>
                <p className="text-[13px] leading-6 text-rubber">{st.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                {['theme', 'home', 'staff', 'coaches', 'legal'].includes(st.key) && (
                  <button type="button" onClick={() => toggle(st)} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-rubber hover:text-chalk">
                    {st.done ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}{st.done ? 'انجام شد' : 'علامت انجام'}
                  </button>
                )}
                <Btn variant={st.done ? 'ghost' : 'primary'} className="h-10" onClick={() => nav(st.link)}>{st.done ? 'ویرایش' : 'شروع'}<ChevronLeft className="size-4" aria-hidden /></Btn>
              </div>
            </Panel>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-rubber">
        <button type="button" className="cursor-pointer font-bold hover:text-chalk" onClick={async () => emit(await panelApi.updateSetup({ guideHidden: !s.guideHidden }))}>
          {s.guideHidden ? 'نمایش دوبارهٔ دستیار شناور در پنل' : 'پنهان کردن دستیار شناور'}
        </button>
      </div>
    </>
  )
}
