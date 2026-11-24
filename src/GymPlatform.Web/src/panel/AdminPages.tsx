import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import {
  panelApi, ROLE_LABEL, STAFF_ROLES, type AdminCampaign, type AdminCanteenItem, type AdminCode, type AdminContract, type AdminPackage,
  type AdminCoach, type AdminProduct, type AdminShopOrder, type Audience, type SaveCampaign, type SmsStats, type StaffRow,
} from '@/lib/panel'
import { centsToInput, euroToCents, faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, toLatinDigits } from '@/member/ui'
import { BranchSelect, PanelTitle, usePanel } from './PanelLayout'
import { CANTEEN_CATS, CanteenItemForm, CoachForm, DeleteButton, PACKAGE_CATS, PackageForm, ProductForm, SECTIONS } from './CatalogForms'

const money = (s: string) => Number(toLatinDigits(s).replace(/[,٬\s]/g, ''))
const euro = (s: string) => euroToCents(toLatinDigits(s))
const sm = `${inputCls} h-11`

function useList<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const reload = useCallback(() => load().then(setData).catch((e: Error) => setErr(e.message)), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, [reload])
  return { data, err, setErr, reload }
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn('relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors', on ? 'bg-[#1f9d55]' : 'bg-steel-2')}>
      <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all', on ? 'left-1' : 'left-6')} />
    </button>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cn('grid gap-1 text-[13px] font-bold text-chalk', className)}>{label}{children}</label>
}

// ================================================================ Pakete
export function PackagesAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.packages)
  const [edit, setEdit] = useState<Record<number, string>>({})
  const [form, setForm] = useState<AdminPackage | 'new' | null>(null)
  const save = async (p: AdminPackage, patch: Partial<AdminPackage>) => {
    setErr(null)
    try {
      const priceToman = patch.priceToman ?? p.priceToman
      await panelApi.updatePackage(p.id, { priceToman, isActive: patch.isActive ?? p.isActive, isFeatured: patch.isFeatured ?? p.isFeatured, tagline: p.tagline })
      setEdit((e) => { const n = { ...e }; delete n[p.id]; return n }); void reload()
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <>
      <PanelTitle title="Pakete und Preise" sub="Ein neuer Preis gilt nur für künftige Käufe; frühere Zahlungen und Rechnungen bleiben unverändert.">
        <Btn className="h-11" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />Neues Paket</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {form && <PackageForm pkg={form === 'new' ? null : form} onCancel={() => setForm(null)} onDone={() => { setForm(null); void reload() }} />}
      <div className="grid gap-3">
        {data?.map((p) => (
          <Panel key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <div className="min-w-[200px] flex-1">
              <p className="text-[16px] font-black text-chalk">{p.name}</p>
              <p className="text-[13px] text-rubber">{PACKAGE_CATS.find(([k]) => k === p.category)?.[1]} – {faNum(p.durationMonths)} {p.durationMonths === 1 ? 'Monat' : 'Monate'}{p.sessions ? ` – ${faNum(p.sessions)} Einheiten` : ' – unbegrenzt'} – {faNum(p.memberships)} Käufe</p>
            </div>
            <button type="button" onClick={() => setForm(p)} className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Pencil className="size-4" aria-hidden />Bearbeiten</button>
            {p.memberships === 0 && <DeleteButton onDelete={async () => { try { await panelApi.deletePackage(p.id); void reload() } catch (x) { setErr((x as Error).message) } }} />}
            {edit[p.id] !== undefined ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void save(p, { priceToman: euro(edit[p.id]) }) }}>
                <input value={edit[p.id]} onChange={(e) => setEdit({ ...edit, [p.id]: e.target.value })} inputMode="numeric" dir="ltr" aria-label="Preis in Euro" autoFocus className={`${sm} w-40 text-right`} />
                <Btn type="submit" className="h-11">Speichern</Btn>
              </form>
            ) : (
              <button type="button" onClick={() => setEdit({ ...edit, [p.id]: centsToInput(p.priceToman) })} className="inline-flex cursor-pointer items-center gap-2 text-[17px] font-black text-chalk hover:text-plate">
                {toman(p.priceToman)}<Pencil className="size-4" aria-hidden /></button>
            )}
            <span className="flex items-center gap-2 text-[13px] text-rubber">Besonderes Angebot<Toggle on={p.isFeatured} onChange={(v) => save(p, { isFeatured: v })} label="Besonderes Angebot" /></span>
            <span className="flex items-center gap-2 text-[13px] text-rubber">Verkauf aktiv<Toggle on={p.isActive} onChange={(v) => save(p, { isActive: v })} label="Verkauf aktiv" /></span>
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ Aktionen und Rabattcodes
const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const emptyCampaign = (): SaveCampaign => ({
  title: '', description: '', startsAtUtc: new Date().toISOString(), endsAtUtc: new Date(Date.now() + 14 * 864e5).toISOString(),
  discountPercent: 15, discountAmountToman: null, eligiblePackageSlugs: [], eligibleBranchSlugs: [], maxRedemptions: null, isActive: true,
})

export function CampaignsAdmin() {
  const c = useList(panelApi.campaigns)
  const codes = useList(panelApi.codes)
  const [form, setForm] = useState<{ id: number | null; v: SaveCampaign } | null>(null)
  const [aud, setAud] = useState<{ id: number; a: Audience; sent?: number } | null>(null)
  const [codeForm, setCodeForm] = useState<{ id: number | null; v: Omit<AdminCode, 'id' | 'usedCount'> } | null>(null)
  const { data: pkgs = [] } = useData('packages', api.packages)
  const { data: branches = [] } = useData('branches', api.branches)
  const [err, setErr] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!form) return; setErr(null)
    try { await panelApi.saveCampaign(form.id, form.v); setForm(null); void c.reload() } catch (x) { setErr((x as Error).message) }
  }
  const audience = async (id: number) => { setErr(null); try { setAud({ id, a: await panelApi.audience(id) }) } catch (x) { setErr((x as Error).message) } }
  const sendSms = async () => {
    if (!aud) return
    try { const r = await panelApi.sendCampaignSms(aud.id); setAud({ ...aud, sent: r.recipients }) } catch (x) { setErr((x as Error).message) }
  }
  const saveCode = async (e: FormEvent) => {
    e.preventDefault(); if (!codeForm) return; setErr(null)
    try { await panelApi.saveCode(codeForm.id, codeForm.v); setCodeForm(null); void codes.reload() } catch (x) { setErr((x as Error).message) }
  }
  const set = (p: Partial<SaveCampaign>) => setForm((f) => f && { ...f, v: { ...f.v, ...p } })
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <>
      <PanelTitle title="Aktionen und Rabattcodes" sub="Eine aktive Aktion wirkt auf der Seite (Leiste oben und Aktionsseite) und in der Preisberechnung bei der Anmeldung.">
        <Btn className="h-11" onClick={() => setForm({ id: null, v: emptyCampaign() })}><Plus className="size-4" aria-hidden />Neue Aktion</Btn>
      </PanelTitle>
      {(err || c.err) && <Notice tone="err" className="mb-4">{err ?? c.err}</Notice>}

      {form && (
        <Panel className="mb-5">
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="Titel" className="md:col-span-2"><input required value={form.v.title} onChange={(e) => set({ title: e.target.value })} className={sm} /></Field>
            <Field label="Kurzbeschreibung" className="md:col-span-2"><input value={form.v.description ?? ''} onChange={(e) => set({ description: e.target.value })} className={sm} /></Field>
            <Field label="Start"><input type="datetime-local" value={isoLocal(new Date(form.v.startsAtUtc))} onChange={(e) => set({ startsAtUtc: new Date(e.target.value).toISOString() })} className={sm} /></Field>
            <Field label="Ende"><input type="datetime-local" value={isoLocal(new Date(form.v.endsAtUtc))} onChange={(e) => set({ endsAtUtc: new Date(e.target.value).toISOString() })} className={sm} /></Field>
            <Field label="Rabattart">
              <select value={form.v.discountAmountToman === null ? 'percent' : 'amount'} onChange={(e) => set(e.target.value === 'percent' ? { discountAmountToman: null } : { discountAmountToman: 1000 })} className={`${sm} cursor-pointer`}>
                <option value="percent">Prozentual</option><option value="amount">Fester Betrag</option>
              </select>
            </Field>
            {form.v.discountAmountToman === null
              ? <Field label="Rabatt in Prozent"><input inputMode="numeric" value={form.v.discountPercent} onChange={(e) => set({ discountPercent: money(e.target.value) })} className={sm} /></Field>
              : <Field label="Rabattbetrag (€)"><input inputMode="numeric" dir="ltr" value={form.v.discountAmountToman / 100} onChange={(e) => set({ discountAmountToman: money(e.target.value) * 100 })} className={`${sm} text-right`} /></Field>}
            <Field label="Maximale Anmeldungen (leer = unbegrenzt)"><input inputMode="numeric" value={form.v.maxRedemptions ?? ''} onChange={(e) => set({ maxRedemptions: e.target.value ? money(e.target.value) : null })} className={sm} /></Field>
            <span className="flex items-center gap-3 self-end pb-2 text-[13px] font-bold">Aktiv<Toggle on={form.v.isActive} onChange={(v) => set({ isActive: v })} label="Aktiv" /></span>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-[13px] font-bold">Pakete (keines = alle)</legend>
              <div className="flex flex-wrap gap-2">{pkgs.map((p) => <Chip key={p.slug} on={form.v.eligiblePackageSlugs.includes(p.slug)} onClick={() => set({ eligiblePackageSlugs: toggleIn(form.v.eligiblePackageSlugs, p.slug) })}>{p.name}</Chip>)}</div>
            </fieldset>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-[13px] font-bold">Filialen (keine = alle)</legend>
              <div className="flex flex-wrap gap-2">{branches.map((b) => <Chip key={b.slug} on={form.v.eligibleBranchSlugs.includes(b.slug)} onClick={() => set({ eligibleBranchSlugs: toggleIn(form.v.eligibleBranchSlugs, b.slug) })}>{b.name}</Chip>)}</div>
            </fieldset>
            <div className="flex gap-2 md:col-span-2"><Btn type="submit">Speichern</Btn><Btn type="button" variant="ghost" onClick={() => setForm(null)}>Abbrechen</Btn></div>
          </form>
        </Panel>
      )}

      <div className="grid gap-3">
        {c.data?.map((x: AdminCampaign) => (
          <Panel key={x.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] flex-1">
                <p className="flex items-center gap-2 text-[16px] font-black text-chalk">{x.title}
                  {x.isRunning ? <span className="rounded-full bg-[#ecf8f1] px-2 py-0.5 text-[11px] text-[#14532d]">Läuft</span> : <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] text-rubber">{x.isActive ? 'Außerhalb des Zeitraums' : 'Inaktiv'}</span>}</p>
                <p className="text-[13px] text-rubber">{jalali(x.startsAtUtc)} bis {jalali(x.endsAtUtc)} – {x.discountAmountToman ? toman(x.discountAmountToman) : `${faNum(x.discountPercent)}%`} Rabatt
                  – {faNum(x.redemptionCount)}{x.maxRedemptions ? ` von ${faNum(x.maxRedemptions)}` : ''} Anmeldungen</p>
              </div>
              <Btn variant="ghost" className="h-10" onClick={() => setForm({ id: x.id, v: { ...x } })}><Pencil className="size-4" aria-hidden />Bearbeiten</Btn>
              <Btn variant="ghost" className="h-10" onClick={() => audience(x.id)}><Megaphone className="size-4" aria-hidden />SMS an frühere Mitglieder</Btn>
            </div>
            {aud?.id === x.id && (
              <div className="mt-4 rounded-[6px] bg-steel p-4 text-[14px]">
                <p><b>{faNum(aud.a.recipients)}</b> Personen erhalten eine SMS — von {faNum(aud.a.expiredMembers)} abgelaufenen Mitgliedern haben {faNum(aud.a.optedOut)} Personen keine Werbe-SMS gewünscht und erhalten keine.</p>
                <p className="mt-2 rounded-[6px] bg-white p-3 text-[13px] leading-7 text-chalk">{aud.a.preview}</p>
                {aud.sent !== undefined
                  ? <Notice tone="ok" className="mt-3">{faNum(aud.sent)} Die SMS sind in der Warteschlange (Versand zwischen 9 und 21 Uhr). Ein erneutes Senden an dieselben Personen erfolgt nicht.</Notice>
                  : <Btn className="mt-3 h-11" disabled={aud.a.recipients === 0 || !x.isRunning} onClick={sendSms}><Send className="size-4" aria-hidden />Senden an {faNum(aud.a.recipients)} Personen</Btn>}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-black text-chalk">Rabattcodes</h2>
        <Btn variant="ghost" className="h-11" onClick={() => setCodeForm({ id: null, v: { code: '', percent: 10, maxUses: null, expiresAtUtc: null, isActive: true, scope: 'any', membersOnly: false } })}><Plus className="size-4" aria-hidden />Neuer Code</Btn>
      </div>
      {codeForm && (
        <Panel className="mb-4">
          <form onSubmit={saveCode} className="grid gap-3 sm:grid-cols-3">
            <Field label="Code (lateinische Buchstaben und Ziffern)"><input required dir="ltr" value={codeForm.v.code} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, code: e.target.value.toUpperCase() } })} className={`${sm} text-right font-mono`} /></Field>
            <Field label="Prozent"><input inputMode="numeric" value={codeForm.v.percent} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, percent: money(e.target.value) } })} className={sm} /></Field>
            <Field label="Nutzungslimit"><input inputMode="numeric" value={codeForm.v.maxUses ?? ''} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, maxUses: e.target.value ? money(e.target.value) : null } })} className={sm} /></Field>
            <Field label="Für">
              <select value={codeForm.v.scope} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, scope: e.target.value as AdminCode['scope'] } })} className={`${sm} cursor-pointer`}>
                <option value="any">Mitgliedschaft und Shop</option><option value="membership">Nur Mitgliedschaft</option><option value="shop">Nur Shop</option>
              </select>
            </Field>
            <Field label="Ablauf"><input type="date" value={codeForm.v.expiresAtUtc?.slice(0, 10) ?? ''} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, expiresAtUtc: e.target.value ? `${e.target.value}T20:29:59Z` : null } })} className={sm} /></Field>
            <span className="flex items-center gap-4 self-end pb-2 text-[13px] font-bold">Nur Mitglieder<Toggle on={codeForm.v.membersOnly} onChange={(v) => setCodeForm({ ...codeForm, v: { ...codeForm.v, membersOnly: v } })} label="Nur Mitglieder" />
              Aktiv<Toggle on={codeForm.v.isActive} onChange={(v) => setCodeForm({ ...codeForm, v: { ...codeForm.v, isActive: v } })} label="Aktiv" /></span>
            <div className="flex gap-2 sm:col-span-3"><Btn type="submit">Speichern</Btn><Btn type="button" variant="ghost" onClick={() => setCodeForm(null)}>Abbrechen</Btn></div>
          </form>
        </Panel>
      )}
      <div className="relative overflow-x-auto rounded-[6px] border border-steel-2 bg-white">
        <table className="w-full min-w-[600px] text-[14px]">
          <thead><tr className="border-b border-steel-2 bg-steel text-[13px] text-rubber"><th className="px-4 py-2.5 text-left">Code</th><th>Prozent</th><th>Für</th><th>Nutzung</th><th>Ablauf</th><th>Status</th><th><span className="sr-only">Bearbeiten</span></th></tr></thead>
          <tbody>
            {codes.data?.map((d) => (
              <tr key={d.id} className="border-b border-steel-2/60 text-center last:border-0">
                <td className="px-4 py-2.5 text-left font-mono font-bold" dir="ltr">{d.code}</td><td>{faNum(d.percent)}%</td>
                <td>{{ any: 'Alle', membership: 'Mitgliedschaft', shop: 'Shop' }[d.scope]}{d.membersOnly ? ' (Mitglieder)' : ''}</td>
                <td>{faNum(d.usedCount)}{d.maxUses ? ` / ${faNum(d.maxUses)}` : ''}</td>
                <td className="text-[13px]">{d.expiresAtUtc ? jalali(d.expiresAtUtc) : '—'}</td>
                <td>{d.isActive ? 'Aktiv' : <span className="text-rubber">Inaktiv</span>}</td>
                <td><button type="button" onClick={() => setCodeForm({ id: d.id, v: d })} aria-label={`Bearbeiten: ${d.code}`} className="cursor-pointer p-2 text-rubber hover:text-plate"><Pencil className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn('h-9 cursor-pointer rounded-full border px-3 text-[13px] font-bold', on ? 'border-plate bg-plate text-white' : 'border-steel-2 bg-white text-chalk hover:border-chalk/40')}>{children}</button>
}

// ================================================================ Vertrag
export function ContractAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.contracts)
  const [draft, setDraft] = useState<{ title: string; clauses: string; questions: string } | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const active = data?.find((c) => c.isActive)
  const publish = async () => {
    if (!draft) return
    setErr(null)
    try {
      const r = await panelApi.publishContract({ title: draft.title, clauses: draft.clauses.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean), healthQuestions: draft.questions.split('\n').map((x) => x.trim()).filter(Boolean) })
      setOk(`Version ${faNum(r.version)} veröffentlicht. Neue Anmeldungen unterschreiben diese Version; frühere Unterschriften bleiben mit ihrer Version gültig.`); setDraft(null); void reload()
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <>
      <PanelTitle title="Mitgliedsvertrag" sub="Der Vertrag ist versioniert: Bearbeiten heißt neue Version veröffentlichen. Der unterschriebene Text eines Mitglieds ändert sich nie.">
        {active && !draft && <Btn className="h-11" onClick={() => setDraft({ title: active.title, clauses: active.clauses.join('\n\n'), questions: active.healthQuestions.join('\n') })}><Pencil className="size-4" aria-hidden />Neue Version</Btn>}
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {ok && <Notice tone="ok" className="mb-4">{ok}</Notice>}
      {draft ? (
        <Panel className="grid gap-4">
          <Field label="Titel"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={sm} /></Field>
          <Field label="Klauseln (eine Leerzeile zwischen den Klauseln)"><textarea rows={16} value={draft.clauses} onChange={(e) => setDraft({ ...draft, clauses: e.target.value })} className={`${inputCls} h-auto py-3 leading-8`} /></Field>
          <Field label="Fragen des Gesundheitsfragebogens (eine Frage pro Zeile)"><textarea rows={6} value={draft.questions} onChange={(e) => setDraft({ ...draft, questions: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
          <div className="flex gap-2"><Btn onClick={publish}>Neue Version veröffentlichen</Btn><Btn variant="ghost" onClick={() => setDraft(null)}>Abbrechen</Btn></div>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {data?.map((c: AdminContract) => (
            <Panel key={c.id} className="p-4 sm:p-5">
              <p className="flex flex-wrap items-center gap-2 text-[16px] font-black text-chalk">Version {faNum(c.version)} – {c.title}
                {c.isActive && <span className="rounded-full bg-[#ecf8f1] px-2 py-0.5 text-[11px] text-[#14532d]">Aktiv</span>}</p>
              <p className="text-[13px] text-rubber">{c.publishedAtUtc ? `Veröffentlicht ${jalali(c.publishedAtUtc)}` : ''} – {faNum(c.clauses.length)} Klauseln – {faNum(c.signatures)} Unterschriften</p>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}

// ================================================================ Shop und Lager
const SHOP_STATUS: Record<string, string> = { paid: 'Bezahlt', ready: 'Abholbereit', shipped: 'Versendet', completed: 'Zugestellt', cancelled: 'Storniert' }
export function ShopAdmin() {
  const me = usePanel()
  const [tab, setTab] = useState<'orders' | 'stock'>('orders')
  return (
    <>
      <PanelTitle title="Shop und Lager" sub={me.roles.includes('SuperAdmin') ? 'Alle Filialen' : `Nur ${me.branches.map((b) => b.name).join(', ')}`}>
        <div role="tablist" className="inline-flex rounded-[3px] border border-steel-2 bg-white p-0.5">
          {(['orders', 'stock'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn('h-10 cursor-pointer rounded-[2px] px-4 text-[14px] font-bold', tab === t ? 'bg-chalk text-white' : 'text-chalk')}>{t === 'orders' ? 'Bestellungen' : 'Bestand und Preis'}</button>)}
        </div>
      </PanelTitle>
      {tab === 'orders' ? <ShopOrders /> : <Stock />}
    </>
  )
}

function ShopOrders() {
  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState<AdminShopOrder[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(() => panelApi.shopOrders(status).then(setRows).catch((e: Error) => setErr(e.message)), [status])
  useEffect(() => { void load() }, [load])
  const move = async (o: AdminShopOrder, s: string) => { try { await panelApi.setShopOrderStatus(o.id, s); void load() } catch (x) { setErr((x as Error).message) } }
  return (
    <>
      <div className="mb-4 flex gap-2">{[['open', 'Offen'], ['done', 'Abgeschlossen'], ['', 'Alle']].map(([k, l]) => <Chip key={k} on={status === k} onClick={() => setStatus(k)}>{l}</Chip>)}</div>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {rows?.length === 0 && <Panel><p className="text-rubber">Keine Bestellungen.</p></Panel>}
      <div className="grid gap-3">
        {rows?.map((o) => (
          <Panel key={o.id} className="p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="font-mono text-[14px] font-bold" dir="ltr">{o.number}</p>
              <span className="rounded-full bg-steel px-2 py-0.5 text-[12px] font-bold">{SHOP_STATUS[o.status] ?? o.status}</span>
              <span className="text-[13px] text-rubber">{o.fulfillment === 'pickup' ? `Abholung – ${o.branchName}` : 'Postversand'}</span>
              <span className="text-[13px] text-rubber">{jalali(o.createdAtUtc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="ms-auto text-[15px] font-black">{toman(o.totalToman)}</span>
            </div>
            <p className="mt-2 text-[14px]">{o.customerName ?? '—'} <span dir="ltr" className="text-rubber">{faDigits(o.customerPhone)}</span>{o.address && <span className="text-rubber"> – {o.address}</span>}</p>
            <p className="mt-1 text-[13px] text-rubber">{o.items.map((i) => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${faNum(i.quantity)}`).join(', ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status === 'paid' && o.fulfillment === 'pickup' && <Btn className="h-10" onClick={() => move(o, 'ready')}>Fertig</Btn>}
              {o.status === 'paid' && o.fulfillment === 'delivery' && <Btn className="h-10" onClick={() => move(o, 'shipped')}>Versendet</Btn>}
              {(o.status === 'ready' || o.status === 'shipped') && <Btn variant="dark" className="h-10" onClick={() => move(o, 'completed')}>Übergeben</Btn>}
            </div>
          </Panel>
        ))}
      </div>
    </>
  )
}

function Stock() {
  const me = usePanel()
  const { data, err, setErr, reload } = useList(panelApi.products)
  const [branch, setBranch] = useState(me.branches[0]?.slug ?? '')
  const [q, setQ] = useState('')
  const [price, setPrice] = useState<Record<number, string>>({})
  const [form, setForm] = useState<AdminProduct | 'new' | null>(null)
  const setQty = async (variant: number, v: string) => {
    const n = money(v); if (Number.isNaN(n)) return
    try { await panelApi.setStock(variant, branch, n); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const savePrice = async (p: AdminProduct, patch: { priceToman?: number; isActive?: boolean }) => {
    try { await panelApi.updateProduct(p.id, { priceToman: patch.priceToman ?? p.priceToman, isActive: patch.isActive ?? p.isActive }); setPrice({}); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const list = (data ?? []).filter((p) => !q || p.name.includes(q) || p.category.includes(q))
  const superAdmin = me.roles.includes('SuperAdmin')
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <BranchSelect value={branch} onChange={setBranch} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Produkt suchen…" aria-label="Produkt suchen" className={`${sm} max-w-xs`} />
        {superAdmin && <Btn className="ms-auto h-11" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />Neues Produkt</Btn>}
      </div>
      {form && <ProductForm product={form === 'new' ? null : form} onCancel={() => setForm(null)} onDone={() => { setForm(null); void reload() }} />}
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      <div className="grid gap-3">
        {list.map((p) => (
          <Panel key={p.id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <img src={p.imagePath} alt="" className="size-14 rounded-[6px] bg-steel object-contain" />
              <div className="min-w-[180px] flex-1"><p className="font-black text-chalk">{p.name}</p><p className="text-[12px] text-rubber">{p.category}</p></div>
              {superAdmin ? (price[p.id] !== undefined
                ? <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void savePrice(p, { priceToman: euro(price[p.id]) }) }}>
                    <input autoFocus dir="ltr" value={price[p.id]} onChange={(e) => setPrice({ [p.id]: e.target.value })} aria-label="Preis" className={`${sm} w-36 text-right`} /><Btn type="submit" className="h-11">Speichern</Btn></form>
                : <button type="button" onClick={() => setPrice({ [p.id]: centsToInput(p.priceToman) })} className="inline-flex cursor-pointer items-center gap-1 font-black hover:text-plate">{toman(p.priceToman)}<Pencil className="size-3.5" aria-hidden /></button>)
                : <span className="font-black">{toman(p.priceToman)}</span>}
              {superAdmin && <button type="button" onClick={() => setForm(p)} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-plate hover:underline"><Pencil className="size-3.5" aria-hidden />Bearbeiten</button>}
              {superAdmin && <span className="flex items-center gap-2 text-[12px] text-rubber">Auf der Seite<Toggle on={p.isActive} onChange={(v) => savePrice(p, { isActive: v })} label="Auf der Seite zeigen" /></span>}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.variants.map((v) => {
                const s = v.stock.find((x) => x.branchSlug === branch)
                return (
                  <li key={v.id} className={cn('flex items-center gap-2 rounded-[6px] border px-2 py-1 text-[13px]', (s?.quantity ?? 0) === 0 ? 'border-danger/40 bg-[#fdecee]' : (s?.quantity ?? 0) < 3 ? 'border-sun bg-[#fff6e0]' : 'border-steel-2')}>
                    <span className="font-bold">{v.label || 'Einzeln'}</span>
                    <input key={`${v.id}-${branch}-${s?.quantity}`} defaultValue={s?.quantity ?? 0} inputMode="numeric" aria-label={`Bestand ${v.label || p.name}`}
                      onBlur={(e) => e.target.value !== String(s?.quantity ?? 0) && setQty(v.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="h-8 w-14 rounded-[3px] border border-steel-2 bg-white text-center" />
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ Bistro-Karte
export function CanteenMenuAdmin() {
  const me = usePanel()
  const { data, err, setErr, reload } = useList(panelApi.canteenItems)
  const [price, setPrice] = useState<Record<number, string>>({})
  const [form, setForm] = useState<AdminCanteenItem | 'new' | null>(null)
  const [cat, setCat] = useState('')
  const save = async (i: AdminCanteenItem, patch: { priceToman?: number; isAvailable?: boolean }) => {
    setErr(null)
    try { await panelApi.updateCanteenItem(i.id, { priceToman: patch.priceToman ?? i.priceToman, isAvailable: patch.isAvailable ?? i.isAvailable }); setPrice({}); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const superAdmin = me.roles.includes('SuperAdmin')
  return (
    <>
      <PanelTitle title="Bistro-Karte" sub={superAdmin ? 'Posten hinzufügen, bearbeiten und löschen; Karte und Preise gelten für alle Filialen.' : 'Ausverkaufte Posten ausschalten, damit niemand sie bestellt. Hinzufügen und Preisänderungen nur durch den Gesamtadmin.'}>
        {superAdmin && <Btn className="h-11" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />Neuer Posten</Btn>}
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {form && <CanteenItemForm item={form === 'new' ? null : form} onCancel={() => setForm(null)} onDone={() => { setForm(null); void reload() }} />}
      <div className="mb-4 flex flex-wrap gap-2"><Chip on={!cat} onClick={() => setCat('')}>Alle</Chip>{CANTEEN_CATS.map(([k, l]) => <Chip key={k} on={cat === k} onClick={() => setCat(k)}>{l}</Chip>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.filter((i) => !cat || i.category === cat).map((i) => (
          <Panel key={i.id} className={cn('flex items-center gap-3 p-3', !i.isAvailable && 'opacity-60')}>
            <img src={i.imagePath} alt="" className="size-14 rounded-[6px] bg-steel object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-chalk">{i.name}</p>
              {superAdmin && price[i.id] !== undefined
                ? <form className="mt-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); void save(i, { priceToman: euro(price[i.id]) }) }}>
                    <input autoFocus dir="ltr" value={price[i.id]} onChange={(e) => setPrice({ [i.id]: e.target.value })} aria-label="Preis" className="h-8 w-28 rounded-[3px] border border-steel-2 px-2 text-right" /><Btn type="submit" className="h-8 px-3 text-[13px]">Speichern</Btn></form>
                : <button type="button" disabled={!superAdmin} onClick={() => setPrice({ [i.id]: centsToInput(i.priceToman) })} className="text-[14px] text-rubber enabled:cursor-pointer enabled:hover:text-plate">{toman(i.priceToman)}</button>}
            </div>
            {superAdmin && <button type="button" onClick={() => setForm(i)} aria-label={`Bearbeiten: ${i.name}`} className="grid size-9 cursor-pointer place-items-center rounded-full text-rubber hover:bg-steel hover:text-plate"><Pencil className="size-4" /></button>}
            <Toggle on={i.isAvailable} onChange={(v) => save(i, { isAvailable: v })} label={`${i.name} Verfügbar`} />
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ Trainer
export function CoachesAdmin() {
  const { data, err, reload } = useList(panelApi.coaches)
  const { data: branches = [] } = useData('branches', api.branches)
  const [form, setForm] = useState<AdminCoach | 'new' | null>(null)
  return (
    <>
      <PanelTitle title="Trainer" sub="Profil im Bereich „Trainer“ der Seite und Login-Konto jedes Trainers für das Trainerpanel.">
        <Btn className="h-11" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />Neuer Trainer</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {form && <CoachForm coach={form === 'new' ? null : form} branches={branches} onCancel={() => setForm(null)} onDone={() => { setForm(null); void reload() }} />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((c) => (
          <Panel key={c.id} className={cn('flex gap-4 p-4', !c.isActive && 'opacity-60')}>
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-steel text-[18px] font-black text-rubber">
              {c.photoUrl ? <img src={c.photoUrl} alt="" className="size-full object-cover" /> : c.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('‌')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[16px] font-black text-chalk">{c.fullName}
                {!c.isActive && <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] text-rubber">Nicht auf der Seite</span>}</p>
              <p className="text-[13px] text-rubber">{c.specialty} – {c.branchName} – {SECTIONS.find(([k]) => k === c.section)?.[1]}</p>
              <p className="mt-2 text-[13px]">
                {c.linkedPhone
                  ? <span className="text-[#1f7a46]">Trainerpanel: <span dir="ltr">{faDigits(c.linkedPhone)}</span> – {faNum(c.trainees)} Schüler</span>
                  : <span className="text-[#7a5600]">Kein Trainerpanel-Konto</span>}
              </p>
            </div>
            <button type="button" onClick={() => setForm(c)} className="self-start inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Pencil className="size-4" aria-hidden />Bearbeiten</button>
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ Mitarbeiter
export function StaffAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.staff)
  const { data: branches = [] } = useData('branches', api.branches)
  const [form, setForm] = useState<{ phone: string; fullName: string; roles: string[]; branchSlugs: string[] } | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!form) return; setErr(null); setOk(null)
    try { await panelApi.saveStaff({ ...form, phone: toLatinDigits(form.phone), fullName: form.fullName || null }); setOk('Gespeichert; die Rechte gelten ab sofort.'); setForm(null); void reload() }
    catch (x) { setErr((x as Error).message) }
  }
  const tog = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v])
  return (
    <>
      <PanelTitle title="Mitarbeiter und Rechte" sub="Mitarbeiter melden sich mit derselben Handynummer und einem SMS-Code an. Filialleitung, Empfang, Bistro und Shop sehen nur die gewählten Filialen.">
        <Btn className="h-11" onClick={() => setForm({ phone: '', fullName: '', roles: ['Reception'], branchSlugs: [] })}><Plus className="size-4" aria-hidden />Neuer Mitarbeiter</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {ok && <Notice tone="ok" className="mb-4">{ok}</Notice>}
      {form && (
        <Panel className="mb-5">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Handy"><input required dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${sm} text-right`} /></Field>
            <Field label="Name"><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={sm} /></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-[13px] font-bold">Rollen (alle entfernen = Zugriff entziehen)</legend>
              <div className="flex flex-wrap gap-2">{STAFF_ROLES.map((r) => <Chip key={r} on={form.roles.includes(r)} onClick={() => setForm({ ...form, roles: tog(form.roles, r) })}>{ROLE_LABEL[r]}</Chip>)}</div></fieldset>
            {!form.roles.includes('SuperAdmin') && (
              <fieldset className="sm:col-span-2"><legend className="mb-2 text-[13px] font-bold">Filialen</legend>
                <div className="flex flex-wrap gap-2">{branches.map((b) => <Chip key={b.slug} on={form.branchSlugs.includes(b.slug)} onClick={() => setForm({ ...form, branchSlugs: tog(form.branchSlugs, b.slug) })}>{b.name}</Chip>)}</div></fieldset>
            )}
            <div className="flex gap-2 sm:col-span-2"><Btn type="submit">Speichern</Btn><Btn type="button" variant="ghost" onClick={() => setForm(null)}>Abbrechen</Btn></div>
          </form>
        </Panel>
      )}
      <div className="relative overflow-x-auto rounded-[6px] border border-steel-2 bg-white">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead><tr className="border-b border-steel-2 bg-steel text-[13px] text-rubber"><th className="px-4 py-2.5 text-left">Name</th><th className="text-left">Rolle</th><th className="text-left">Filiale</th><th>Letzter Login</th><th><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>
            {data?.map((s: StaffRow) => (
              <tr key={s.userId} className="border-b border-steel-2/60 last:border-0">
                <td className="px-4 py-2.5"><b>{s.fullName ?? '—'}</b><span dir="ltr" className="block text-left text-[12px] text-rubber">{faDigits(s.phone)}</span></td>
                <td className="text-[13px]">{s.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}</td>
                <td className="max-w-[260px] text-[12px] text-rubber">{s.roles.includes('SuperAdmin') ? 'Alle' : s.branches.map((b) => b.name).join(', ') || '—'}</td>
                <td className="text-center text-[12px] text-rubber">{s.lastLoginAtUtc ? jalali(s.lastLoginAtUtc) : '—'}</td>
                <td className="flex gap-1 px-2 py-2.5">
                  <button type="button" aria-label="Bearbeiten" onClick={() => setForm({ phone: s.phone, fullName: s.fullName ?? '', roles: s.roles.filter((r) => ROLE_LABEL[r]), branchSlugs: s.branches.map((b) => b.slug) })} className="cursor-pointer p-2 text-rubber hover:text-plate"><Pencil className="size-4" /></button>
                  <button type="button" aria-label="Zugriff entziehen" onClick={() => setForm({ phone: s.phone, fullName: s.fullName ?? '', roles: [], branchSlugs: [] })} className="cursor-pointer p-2 text-rubber hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ================================================================ SMS
const SMS_KIND: Record<string, string> = { welcome: 'Willkommen', reminder7: 'Erinnerung 7 Tage', reminder1: 'Erinnerung 1 Tag', birthday: 'Geburtstag', campaign: 'Aktion', custom: 'Sonstiges' }
export function SmsAdmin() {
  const [kind, setKind] = useState('')
  const [d, setD] = useState<SmsStats | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(() => panelApi.sms(kind || undefined).then(setD).catch(() => null), [kind])
  useEffect(() => { void load() }, [load])
  const run = async () => { const r = await panelApi.runSms(); setMsg(`${faNum(r.scheduled)} Neue SMS in der Warteschlange, ${faNum(r.sent)} gesendet.`); void load() }
  return (
    <>
      <PanelTitle title="SMS" sub="Willkommen sofort; Erinnerungen, Geburtstag und Aktionen nur von 9 bis 21 Uhr. Jede SMS erreicht jede Person nur einmal.">
        <Btn variant="ghost" className="h-11" onClick={run}>Jetzt prüfen und senden</Btn>
      </PanelTitle>
      {msg && <Notice tone="ok" className="mb-4">{msg}</Notice>}
      {d && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[['In der Warteschlange', d.queued], ['Heute gesendet', d.sentToday], ['Fehlgeschlagen', d.failed]].map(([l, v]) => (
            <div key={l} className="rounded-[8px] border border-steel-2 bg-white p-4"><p className="text-[13px] text-rubber">{l}</p><p className="text-[24px] font-black">{faNum(v as number)}</p></div>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2"><Chip on={!kind} onClick={() => setKind('')}>Alle</Chip>{Object.entries(SMS_KIND).slice(0, 5).map(([k, l]) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{l}</Chip>)}</div>
      <div className="grid gap-2">
        {d?.recent.map((s) => (
          <div key={s.id} className="rounded-[6px] border border-steel-2 bg-white p-3">
            <p className="flex flex-wrap items-center gap-2 text-[12px] text-rubber">
              <span className="rounded-full bg-steel px-2 py-0.5 font-bold text-chalk">{SMS_KIND[s.kind] ?? s.kind}</span>
              <span dir="ltr">{faDigits(s.phone)}</span>
              <span className={cn('font-bold', s.status === 'sent' ? 'text-[#1f7a46]' : s.status === 'failed' ? 'text-danger' : 'text-[#7a5600]')}>{s.status === 'sent' ? 'Versendet' : s.status === 'failed' ? 'Fehlgeschlagen' : 'In der Warteschlange'}</span>
              <span className="ms-auto">{jalali(s.sentAtUtc ?? s.createdAtUtc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <p className="mt-1 text-[14px] leading-7 text-chalk">{s.preview}</p>
            {s.error && <p className="text-[12px] text-danger">{s.error}</p>}
          </div>
        ))}
      </div>
    </>
  )
}
