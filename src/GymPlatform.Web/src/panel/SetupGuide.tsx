import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Circle, PartyPopper, Rocket, Sparkles, X } from 'lucide-react'
import { panelApi, type SetupStatus, type SetupStep } from '@/lib/panel'
import { reloadSite } from '@/lib/site'
import { faNum } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, Notice, Panel, Spinner } from '@/member/ui'
import { PanelTitle } from './PanelLayout'

// ---------------- Gemeinsamer Zustand des Assistenten (einmal gelesen, nach jeder Änderung aktualisiert)
let status: SetupStatus | null = null
const subs = new Set<() => void>()
const emit = (s: SetupStatus) => { status = s; subs.forEach((f) => f()) }
export const refreshSetup = () => panelApi.setup().then(emit).catch(() => {})
const useSetup = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => status)

const pathOf = (link: string) => link.split('?')[0]
const nextStep = (s: SetupStatus) => s.steps.find((x) => !x.done && !x.optional && x.key !== 'publish') ?? s.steps.find((x) => !x.done && x.key !== 'publish') ?? s.steps.find((x) => x.key === 'publish' && !x.done)

/**
 * Schwebender Assistent für den Gesamtadmin: bleibt in der Panel-Ecke, bis die Seite veröffentlicht ist (oder ein Schritt fehlt),
 * zeigt den nächsten Schritt und führt mit einem Klick dorthin. Auf der Seite jedes Schritts steht oben die passende Anleitung.
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
            <p className="text-[14px] font-black text-chalk">Schritt „{here.title}»</p>
            <p className="text-[13px] leading-6 text-rubber">{here.hint}</p>
          </div>
          <ManualDone step={here} />
        </div>
      )}
      <div className={cn('fixed right-4 z-[60] w-[min(340px,calc(100vw-2rem))]', pathname.startsWith('/panel/site') ? 'bottom-24' : 'bottom-4')}>
        {open ? (
          <div role="complementary" aria-label="Einrichtungsassistent" className="overflow-hidden rounded-[10px] border border-steel-2 bg-white shadow-[0_12px_40px_rgb(0_0_0/.15)]">
            <div className="flex items-center gap-2 bg-chalk px-4 py-3 text-white">
              <Rocket className="size-4" aria-hidden />
              <p className="flex-1 text-[14px] font-black">Website einrichten</p>
              <span className="text-[12px] text-white/70">{faNum(s.doneCount)} von {faNum(s.requiredCount)}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Verkleinern" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-white/10"><X className="size-4" /></button>
            </div>
            <div className="h-1.5 bg-steel"><div className="h-full bg-plate transition-all" style={{ width: `${pct}%` }} /></div>
            {step && (
              <div className="p-4">
                <p className="text-[12px] font-bold text-rubber">Nächster Schritt</p>
                <p className="mt-0.5 text-[16px] font-black text-chalk">{step.title}</p>
                <p className="mt-1 text-[13px] leading-6 text-rubber">{step.hint}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link to={step.link} className="inline-flex h-10 items-center gap-1 rounded-[3px] bg-plate px-4 text-[14px] font-bold text-white hover:bg-plate-hi">Zu diesem Schritt<ChevronRight className="size-4" aria-hidden /></Link>
                  <Link to="/panel/setup" className="text-[13px] font-bold text-rubber hover:text-chalk">Alle Schritte</Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-chalk px-4 text-[14px] font-bold text-white shadow-lg">
            <Rocket className="size-4" aria-hidden />Einrichtung: {faNum(s.doneCount)} von {faNum(s.requiredCount)}
          </button>
        )}
      </div>
    </>
  )
}

/** Schritte, die sich nicht aus den Daten ergeben (Farbe, Startseitentext), markiert der Inhaber selbst als „erledigt“ */
function ManualDone({ step }: { step: SetupStep }) {
  const [busy, setBusy] = useState(false)
  if (!['theme', 'home', 'staff', 'coaches', 'legal'].includes(step.key)) return null
  return (
    <Btn variant="ghost" className="h-10" busy={busy} onClick={async () => {
      setBusy(true)
      try { emit(await panelApi.updateSetup({ step: step.key, stepDone: true })) } finally { setBusy(false) }
    }}><Check className="size-4" aria-hidden />Dieser Schritt ist erledigt</Btn>
  )
}

/** Vollständige Seite des Assistenten: alle Schritte, Veröffentlichung */
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
      <PanelTitle title="Einrichtungsassistent" sub="Vervollständigen Sie die Seite Schritt für Schritt; jeder Schritt hat einen Button, der direkt zur passenden Seite führt." />
      <Panel className="mb-5 flex flex-wrap items-center gap-4 p-5">
        <div className={cn('grid size-14 place-items-center rounded-full', s.published ? 'bg-[#e3f5ea] text-[#1f7a46]' : 'bg-sun/25 text-[#7a5600]')}>
          {s.published ? <PartyPopper className="size-7" aria-hidden /> : <Rocket className="size-7" aria-hidden />}
        </div>
        <div className="min-w-[220px] flex-1">
          <p className="text-[18px] font-black text-chalk">{s.published ? 'Die Seite ist veröffentlicht und für alle offen' : 'Die Seite ist noch nicht veröffentlicht'}</p>
          <p className="text-[14px] text-rubber">
            {s.published ? 'Jede Änderung im Panel ist sofort auf der Seite sichtbar.' : 'Besucher sehen vorerst die Seite „Im Aufbau“; Sie und Ihre Mitarbeiter sehen die vollständige Seite.'}
            {' '}{faNum(s.doneCount)} von {faNum(s.requiredCount)} Pflichtschritte erledigt.
          </p>
        </div>
        {s.published
          ? <Btn variant="ghost" busy={busy} onClick={() => publish(false)}>Zurück auf „Im Aufbau“</Btn>
          : <Btn busy={busy} disabled={!ready} onClick={() => publish(true)}><Rocket className="size-4" aria-hidden />Seite veröffentlichen</Btn>}
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
                  {st.optional && <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] font-bold text-rubber">Optional</span>}</p>
                <p className="text-[13px] leading-6 text-rubber">{st.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                {['theme', 'home', 'staff', 'coaches', 'legal'].includes(st.key) && (
                  <button type="button" onClick={() => toggle(st)} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-rubber hover:text-chalk">
                    {st.done ? <Check className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}{st.done ? 'Erledigt' : 'Als erledigt markieren'}
                  </button>
                )}
                <Btn variant={st.done ? 'ghost' : 'primary'} className="h-10" onClick={() => nav(st.link)}>{st.done ? 'Bearbeiten' : 'Start'}<ChevronRight className="size-4" aria-hidden /></Btn>
              </div>
            </Panel>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-rubber">
        <button type="button" className="cursor-pointer font-bold hover:text-chalk" onClick={async () => emit(await panelApi.updateSetup({ guideHidden: !s.guideHidden }))}>
          {s.guideHidden ? 'Schwebenden Assistenten im Panel wieder anzeigen' : 'Schwebenden Assistenten ausblenden'}
        </button>
      </div>
    </>
  )
}
