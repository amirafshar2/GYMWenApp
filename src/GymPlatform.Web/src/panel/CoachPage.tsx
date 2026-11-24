import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, Plus, Save, Trash2, UserPlus } from 'lucide-react'
import { panelApi, type PlanDay, type TraineeDetail, type TraineeRow } from '@/lib/panel'
import { faDigits, faNum, jalali } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, toLatinDigits } from '@/member/ui'
import { WeightLine } from './charts'
import { PanelTitle, usePanel } from './PanelLayout'

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const kg = (n: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(n)} kg`

export default function CoachPage() {
  const me = usePanel()
  const [rows, setRows] = useState<TraineeRow[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const load = useCallback(() => panelApi.trainees().then(setRows).catch((e: Error) => setErr(e.message)), [])
  useEffect(() => { void load() }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try { const t = await panelApi.addTrainee(toLatinDigits(phone)); setPhone(''); await load(); setOpen(t.userId) }
    catch (x) { setErr((x as Error).message) }
  }

  if (!me.coachId) return <Notice tone="warn">Ihr Konto ist noch nicht mit einem Trainerprofil verbunden. Der Gesamtadmin muss im Panel unter „Trainer“ Ihre Handynummer für Ihr Profil eintragen.</Notice>
  if (open !== null) return <Trainee id={open} onBack={() => { setOpen(null); void load() }} />

  const list = (rows ?? []).filter((r) => !filter || (r.fullName ?? '').includes(filter) || r.phone.includes(toLatinDigits(filter)))
  return (
    <>
      <PanelTitle title="Meine Schüler" sub="Trainings- und Ernährungsplan, den Sie hier schreiben, erscheint sofort im Profil des Schülers." />
      <Panel className="mb-5">
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <label htmlFor="tp" className="sr-only">Handy des Schülers</label>
          <input id="tp" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="Handy des neuen Schülers, z. B. 0151…" className={`${inputCls} max-w-xs text-right`} />
          <Btn type="submit"><UserPlus className="size-4" aria-hidden />Schüler hinzufügen</Btn>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Schüler suchen…" aria-label="Suchen" className={`${inputCls} ms-auto max-w-xs`} />
        </form>
        {err && <Notice tone="err" className="mt-3">{err}</Notice>}
      </Panel>
      {!rows ? <p className="text-rubber">…</p> : list.length === 0 ? <Panel><p className="text-rubber">Noch keine Schüler.</p></Panel> : (
        <div className="relative overflow-x-auto rounded-[6px] border border-steel-2 bg-white">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead><tr className="border-b border-steel-2 bg-steel text-[13px] text-rubber">
              <th className="px-4 py-3 text-left font-bold">Schüler</th><th className="text-left font-bold">Mitgliedschaft</th><th className="font-bold">Gewicht</th><th className="font-bold">Veränderung</th><th className="font-bold">Plan</th><th className="font-bold">Letzter Besuch</th>
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.userId} onClick={() => setOpen(r.userId)} className="cursor-pointer border-b border-steel-2/70 last:border-0 hover:bg-steel/70">
                  <td className="px-4 py-3"><button type="button" className="cursor-pointer text-left font-bold text-chalk">{r.fullName ?? 'Ohne Namen'}</button>
                    <span dir="ltr" className="block text-left text-[12px] text-rubber">{faDigits(r.phone)}</span></td>
                  <td>{r.activePackage ? <>{r.activePackage}<span className="block text-[12px] text-rubber">{faNum(r.daysLeft ?? 0)} Resttage</span></> : <span className="text-danger">Abgelaufen</span>}</td>
                  <td className="text-center">{r.lastWeightKg ? kg(r.lastWeightKg) : '—'}</td>
                  <td className="text-center">{r.weightChangeKg ? <span className={cn('font-bold', r.weightChangeKg < 0 ? 'text-[#1f7a46]' : 'text-chalk')}>{kg(Math.abs(r.weightChangeKg))} {r.weightChangeKg < 0 ? 'Abnahme' : 'Zunahme'}</span> : '—'}</td>
                  <td className="text-center">{r.planUpdatedAtUtc ? jalali(r.planUpdatedAtUtc) : <span className="rounded-full bg-[#fff6e0] px-2 py-0.5 text-[12px] font-bold text-[#5c4300]">Keine</span>}</td>
                  <td className="text-center text-[13px] text-rubber">{r.lastCheckInUtc ? jalali(r.lastCheckInUtc, { day: 'numeric', month: 'short' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Trainee({ id, onBack }: { id: number; onBack: () => void }) {
  const [d, setD] = useState<TraineeDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [days, setDays] = useState<PlanDay[]>([])
  const [nutrition, setNutrition] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => panelApi.trainee(id).then((x) => {
    setD(x)
    setTitle(x.plan?.title ?? 'Wochenplan')
    setDays(x.plan?.days.length ? x.plan.days : [{ day: 'Montag', focus: '', items: [] }])
    setNutrition(x.plan?.nutrition ?? '')
  }).catch((e: Error) => setErr(e.message)), [id])
  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true); setErr(null); setOk(null)
    try {
      await panelApi.savePlan(id, { title, days: days.map((x) => ({ ...x, items: x.items.map((i) => i.trim()).filter(Boolean) })).filter((x) => x.focus || x.items.length), nutrition: nutrition.trim() || null })
      setOk('Plan gespeichert; er erscheint im Profil des Schülers.'); void load()
    } catch (x) { setErr((x as Error).message) } finally { setSaving(false) }
  }
  const addWeight = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const v = Number(toLatinDigits(weight).replace(',', '.').replace('/', '.'))
    try { await panelApi.addMetric(id, { weightKg: v }); setWeight(''); void load() } catch (x) { setErr((x as Error).message) }
  }
  const setDay = (i: number, p: Partial<PlanDay>) => setDays((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)))

  if (!d) return err ? <Notice tone="err">{err}</Notice> : <p className="text-rubber">…</p>
  const m = d.member
  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-rubber hover:text-chalk"><ChevronLeft className="size-4" aria-hidden />Alle Schüler</button>
      <PanelTitle title={m.fullName ?? 'Schüler'} sub={`${faDigits(m.phone)} – ${d.active ? `${d.active.packageName}, ${faNum(d.active.daysLeft ?? 0)} Resttage` : 'Keine aktive Mitgliedschaft'} – ${faNum(d.checkIns30)} Besuche in den letzten 30 Tagen`} />
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {ok && <Notice tone="ok" className="mb-4">{ok}</Notice>}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-black text-chalk">Trainingsplan</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Plantitel" className={`${inputCls} h-11 max-w-sm flex-1`} />
          </div>
          <div className="grid gap-3">
            {days.map((x, i) => (
              <div key={i} className="grid gap-2 rounded-[6px] bg-steel p-3 sm:grid-cols-[140px_1fr_auto]">
                <select value={x.day} onChange={(e) => setDay(i, { day: e.target.value })} aria-label="Tage" className={`${inputCls} h-11 cursor-pointer`}>
                  {DAYS.map((dd) => <option key={dd}>{dd}</option>)}
                </select>
                <input value={x.focus} onChange={(e) => setDay(i, { focus: e.target.value })} placeholder="Fokus, z. B. Brust und Trizeps" aria-label="Tagesfokus" className={`${inputCls} h-11`} />
                <button type="button" onClick={() => setDays((l) => l.filter((_, j) => j !== i))} aria-label="Tag löschen" className="grid size-11 cursor-pointer place-items-center rounded-[3px] text-rubber hover:bg-white hover:text-danger"><Trash2 className="size-4" /></button>
                <textarea value={x.items.join('\n')} onChange={(e) => setDay(i, { items: e.target.value.split('\n') })} rows={4} aria-label="Übungen, eine pro Zeile"
                  placeholder={'Eine Übung pro Zeile:\nBankdrücken 4×10\nKurzhantel-Fliegende 3×12'} className={`${inputCls} h-auto py-3 sm:col-span-3`} />
              </div>
            ))}
          </div>
          <Btn variant="ghost" className="mt-3 h-11" disabled={days.length >= 7} onClick={() => setDays((l) => [...l, { day: DAYS.find((dd) => !l.some((x) => x.day === dd)) ?? 'Samstag', focus: '', items: [] }])}>
            <Plus className="size-4" aria-hidden />Tag hinzufügen</Btn>
          <h2 className="mb-2 mt-6 text-[17px] font-black text-chalk">Ernährungsplan</h2>
          <textarea value={nutrition} onChange={(e) => setNutrition(e.target.value)} rows={5} placeholder="Frühstück, Mittag, nach dem Training, Abendessen…" className={`${inputCls} h-auto py-3`} />
          <Btn className="mt-4" busy={saving} onClick={save}><Save className="size-4" aria-hidden />Speichern und an Schüler senden</Btn>
          {d.plan && <p className="mt-2 text-[12px] text-rubber">Zuletzt bearbeitet: {jalali(d.plan.updatedAtUtc, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
        </Panel>
        <Panel>
          <h2 className="mb-3 text-[17px] font-black text-chalk">Gewichtsverlauf</h2>
          <WeightLine points={d.metrics.map((x) => ({ label: jalali(x.measuredOn + 'T12:00:00Z', { day: 'numeric', month: 'short' }), kg: x.weightKg }))} />
          <form onSubmit={addWeight} className="mt-4 flex gap-2">
            <label htmlFor="w" className="sr-only">Gewicht heute</label>
            <input id="w" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="Gewicht heute (kg)" className={`${inputCls} h-11`} />
            <Btn type="submit" variant="dark" className="h-11" disabled={!weight}>Speichern</Btn>
          </form>
          {d.metrics.length > 0 && (
            <ul className="mt-4 grid max-h-60 gap-1 overflow-y-auto text-[13px]">
              {[...d.metrics].reverse().map((x) => (
                <li key={x.id} className="flex justify-between border-b border-steel-2/60 py-1"><span className="text-rubber">{jalali(x.measuredOn + 'T12:00:00Z', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span className="font-bold">{kg(x.weightKg)}{x.bodyFatPercent ? ` – Fett ${faNum(x.bodyFatPercent)}%` : ''}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
