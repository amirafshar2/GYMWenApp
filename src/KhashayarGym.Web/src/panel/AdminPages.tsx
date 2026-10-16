import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useData } from '@/lib/useData'
import {
  panelApi, ROLE_LABEL, STAFF_ROLES, type AdminCampaign, type AdminCanteenItem, type AdminCode, type AdminContract, type AdminPackage,
  type AdminProduct, type AdminShopOrder, type Audience, type SaveCampaign, type SmsStats, type StaffRow,
} from '@/lib/panel'
import { rebrand } from '@/lib/brand'
import { faDigits, faNum, jalali, toman } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, toLatinDigits } from '@/member/ui'
import { BranchSelect, PanelTitle, usePanel } from './PanelLayout'

const money = (s: string) => Number(toLatinDigits(s).replace(/[,٬\s]/g, ''))
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
      <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-all', on ? 'right-1' : 'right-6')} />
    </button>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cn('grid gap-1 text-[13px] font-bold text-chalk', className)}>{label}{children}</label>
}

// ================================================================ پکیج‌ها
export function PackagesAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.packages)
  const [edit, setEdit] = useState<Record<number, string>>({})
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
      <PanelTitle title="پکیج‌ها و قیمت" sub="قیمت تازه فقط برای خریدهای بعدی اعمال می‌شود؛ پرداخت‌های قبلی و فاکتورها دست نمی‌خورند." />
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      <div className="grid gap-3">
        {data?.map((p) => (
          <Panel key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <div className="min-w-[200px] flex-1">
              <p className="text-[16px] font-black text-chalk">{p.name}</p>
              <p className="text-[13px] text-rubber">{faNum(p.durationMonths)} ماه{p.sessions ? ` – ${faNum(p.sessions)} جلسه` : ' – نامحدود'}</p>
            </div>
            {edit[p.id] !== undefined ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void save(p, { priceToman: money(edit[p.id]) }) }}>
                <input value={edit[p.id]} onChange={(e) => setEdit({ ...edit, [p.id]: e.target.value })} inputMode="numeric" dir="ltr" aria-label="قیمت به تومان" autoFocus className={`${sm} w-40 text-left`} />
                <Btn type="submit" className="h-11">ذخیره</Btn>
              </form>
            ) : (
              <button type="button" onClick={() => setEdit({ ...edit, [p.id]: String(p.priceToman) })} className="inline-flex cursor-pointer items-center gap-2 text-[17px] font-black text-chalk hover:text-plate">
                {toman(p.priceToman)}<Pencil className="size-4" aria-hidden /></button>
            )}
            <span className="flex items-center gap-2 text-[13px] text-rubber">پیشنهاد ویژه<Toggle on={p.isFeatured} onChange={(v) => save(p, { isFeatured: v })} label="پیشنهاد ویژه" /></span>
            <span className="flex items-center gap-2 text-[13px] text-rubber">فروش فعال<Toggle on={p.isActive} onChange={(v) => save(p, { isActive: v })} label="فروش فعال" /></span>
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ جشنواره و کد تخفیف
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
      <PanelTitle title="جشنواره و کد تخفیف" sub="جشنوارهٔ فعال روی سایت (نوار بالا و صفحهٔ جشنواره) و در محاسبهٔ قیمت ثبت‌نام اعمال می‌شود.">
        <Btn className="h-11" onClick={() => setForm({ id: null, v: emptyCampaign() })}><Plus className="size-4" aria-hidden />جشنوارهٔ تازه</Btn>
      </PanelTitle>
      {(err || c.err) && <Notice tone="err" className="mb-4">{err ?? c.err}</Notice>}

      {form && (
        <Panel className="mb-5">
          <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="عنوان" className="md:col-span-2"><input required value={form.v.title} onChange={(e) => set({ title: e.target.value })} className={sm} /></Field>
            <Field label="توضیح کوتاه" className="md:col-span-2"><input value={form.v.description ?? ''} onChange={(e) => set({ description: e.target.value })} className={sm} /></Field>
            <Field label="شروع"><input type="datetime-local" value={isoLocal(new Date(form.v.startsAtUtc))} onChange={(e) => set({ startsAtUtc: new Date(e.target.value).toISOString() })} className={sm} /></Field>
            <Field label="پایان"><input type="datetime-local" value={isoLocal(new Date(form.v.endsAtUtc))} onChange={(e) => set({ endsAtUtc: new Date(e.target.value).toISOString() })} className={sm} /></Field>
            <Field label="نوع تخفیف">
              <select value={form.v.discountAmountToman === null ? 'percent' : 'amount'} onChange={(e) => set(e.target.value === 'percent' ? { discountAmountToman: null } : { discountAmountToman: 500_000 })} className={`${sm} cursor-pointer`}>
                <option value="percent">درصدی</option><option value="amount">مبلغ ثابت</option>
              </select>
            </Field>
            {form.v.discountAmountToman === null
              ? <Field label="درصد تخفیف"><input inputMode="numeric" value={form.v.discountPercent} onChange={(e) => set({ discountPercent: money(e.target.value) })} className={sm} /></Field>
              : <Field label="مبلغ تخفیف (تومان)"><input inputMode="numeric" dir="ltr" value={form.v.discountAmountToman} onChange={(e) => set({ discountAmountToman: money(e.target.value) })} className={`${sm} text-left`} /></Field>}
            <Field label="سقف تعداد ثبت‌نام (خالی = بدون سقف)"><input inputMode="numeric" value={form.v.maxRedemptions ?? ''} onChange={(e) => set({ maxRedemptions: e.target.value ? money(e.target.value) : null })} className={sm} /></Field>
            <span className="flex items-center gap-3 self-end pb-2 text-[13px] font-bold">فعال<Toggle on={form.v.isActive} onChange={(v) => set({ isActive: v })} label="فعال" /></span>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-[13px] font-bold">پکیج‌ها (هیچ‌کدام = همه)</legend>
              <div className="flex flex-wrap gap-2">{pkgs.map((p) => <Chip key={p.slug} on={form.v.eligiblePackageSlugs.includes(p.slug)} onClick={() => set({ eligiblePackageSlugs: toggleIn(form.v.eligiblePackageSlugs, p.slug) })}>{p.name}</Chip>)}</div>
            </fieldset>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-[13px] font-bold">شعبه‌ها (هیچ‌کدام = همه)</legend>
              <div className="flex flex-wrap gap-2">{branches.map((b) => <Chip key={b.slug} on={form.v.eligibleBranchSlugs.includes(b.slug)} onClick={() => set({ eligibleBranchSlugs: toggleIn(form.v.eligibleBranchSlugs, b.slug) })}>{b.name}</Chip>)}</div>
            </fieldset>
            <div className="flex gap-2 md:col-span-2"><Btn type="submit">ذخیره</Btn><Btn type="button" variant="ghost" onClick={() => setForm(null)}>انصراف</Btn></div>
          </form>
        </Panel>
      )}

      <div className="grid gap-3">
        {c.data?.map((x: AdminCampaign) => (
          <Panel key={x.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] flex-1">
                <p className="flex items-center gap-2 text-[16px] font-black text-chalk">{rebrand(x.title)}
                  {x.isRunning ? <span className="rounded-full bg-[#ecf8f1] px-2 py-0.5 text-[11px] text-[#14532d]">در حال اجرا</span> : <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] text-rubber">{x.isActive ? 'خارج از بازه' : 'غیرفعال'}</span>}</p>
                <p className="text-[13px] text-rubber">{jalali(x.startsAtUtc)} تا {jalali(x.endsAtUtc)} – {x.discountAmountToman ? toman(x.discountAmountToman) : `${faNum(x.discountPercent)}٪`} تخفیف
                  – {faNum(x.redemptionCount)}{x.maxRedemptions ? ` از ${faNum(x.maxRedemptions)}` : ''} ثبت‌نام</p>
              </div>
              <Btn variant="ghost" className="h-10" onClick={() => setForm({ id: x.id, v: { ...x } })}><Pencil className="size-4" aria-hidden />ویرایش</Btn>
              <Btn variant="ghost" className="h-10" onClick={() => audience(x.id)}><Megaphone className="size-4" aria-hidden />پیامک به اعضای قبلی</Btn>
            </div>
            {aud?.id === x.id && (
              <div className="mt-4 rounded-[6px] bg-steel p-4 text-[14px]">
                <p><b>{faNum(aud.a.recipients)}</b> نفر پیامک می‌گیرند — از {faNum(aud.a.expiredMembers)} عضو منقضی‌شده، {faNum(aud.a.optedOut)} نفر پیامک تبلیغاتی را نخواسته‌اند و پیامک نمی‌گیرند.</p>
                <p className="mt-2 rounded-[6px] bg-white p-3 text-[13px] leading-7 text-chalk">{rebrand(aud.a.preview)}</p>
                {aud.sent !== undefined
                  ? <Notice tone="ok" className="mt-3">{faNum(aud.sent)} پیامک در صف ارسال قرار گرفت (بین ۹ صبح تا ۹ شب فرستاده می‌شوند). ارسال دوباره به همان افراد تکرار نمی‌شود.</Notice>
                  : <Btn className="mt-3 h-11" disabled={aud.a.recipients === 0 || !x.isRunning} onClick={sendSms}><Send className="size-4" aria-hidden />ارسال برای {faNum(aud.a.recipients)} نفر</Btn>}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-black text-chalk">کدهای تخفیف</h2>
        <Btn variant="ghost" className="h-11" onClick={() => setCodeForm({ id: null, v: { code: '', percent: 10, maxUses: null, expiresAtUtc: null, isActive: true, scope: 'any', membersOnly: false } })}><Plus className="size-4" aria-hidden />کد تازه</Btn>
      </div>
      {codeForm && (
        <Panel className="mb-4">
          <form onSubmit={saveCode} className="grid gap-3 sm:grid-cols-3">
            <Field label="کد (حروف و رقم لاتین)"><input required dir="ltr" value={codeForm.v.code} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, code: e.target.value.toUpperCase() } })} className={`${sm} text-left font-mono`} /></Field>
            <Field label="درصد"><input inputMode="numeric" value={codeForm.v.percent} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, percent: money(e.target.value) } })} className={sm} /></Field>
            <Field label="سقف استفاده"><input inputMode="numeric" value={codeForm.v.maxUses ?? ''} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, maxUses: e.target.value ? money(e.target.value) : null } })} className={sm} /></Field>
            <Field label="برای">
              <select value={codeForm.v.scope} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, scope: e.target.value as AdminCode['scope'] } })} className={`${sm} cursor-pointer`}>
                <option value="any">عضویت و فروشگاه</option><option value="membership">فقط عضویت</option><option value="shop">فقط فروشگاه</option>
              </select>
            </Field>
            <Field label="انقضا"><input type="date" value={codeForm.v.expiresAtUtc?.slice(0, 10) ?? ''} onChange={(e) => setCodeForm({ ...codeForm, v: { ...codeForm.v, expiresAtUtc: e.target.value ? `${e.target.value}T20:29:59Z` : null } })} className={sm} /></Field>
            <span className="flex items-center gap-4 self-end pb-2 text-[13px] font-bold">فقط اعضا<Toggle on={codeForm.v.membersOnly} onChange={(v) => setCodeForm({ ...codeForm, v: { ...codeForm.v, membersOnly: v } })} label="فقط اعضا" />
              فعال<Toggle on={codeForm.v.isActive} onChange={(v) => setCodeForm({ ...codeForm, v: { ...codeForm.v, isActive: v } })} label="فعال" /></span>
            <div className="flex gap-2 sm:col-span-3"><Btn type="submit">ذخیره</Btn><Btn type="button" variant="ghost" onClick={() => setCodeForm(null)}>انصراف</Btn></div>
          </form>
        </Panel>
      )}
      <div className="overflow-x-auto rounded-[6px] border border-steel-2 bg-white">
        <table className="w-full min-w-[600px] text-[14px]">
          <thead><tr className="border-b border-steel-2 bg-steel text-[13px] text-rubber"><th className="px-4 py-2.5 text-right">کد</th><th>درصد</th><th>برای</th><th>استفاده</th><th>انقضا</th><th>وضعیت</th><th><span className="sr-only">ویرایش</span></th></tr></thead>
          <tbody>
            {codes.data?.map((d) => (
              <tr key={d.id} className="border-b border-steel-2/60 text-center last:border-0">
                <td className="px-4 py-2.5 text-right font-mono font-bold" dir="ltr">{d.code}</td><td>{faNum(d.percent)}٪</td>
                <td>{{ any: 'همه', membership: 'عضویت', shop: 'فروشگاه' }[d.scope]}{d.membersOnly ? ' (اعضا)' : ''}</td>
                <td>{faNum(d.usedCount)}{d.maxUses ? ` / ${faNum(d.maxUses)}` : ''}</td>
                <td className="text-[13px]">{d.expiresAtUtc ? jalali(d.expiresAtUtc) : '—'}</td>
                <td>{d.isActive ? 'فعال' : <span className="text-rubber">غیرفعال</span>}</td>
                <td><button type="button" onClick={() => setCodeForm({ id: d.id, v: d })} aria-label={`ویرایش ${d.code}`} className="cursor-pointer p-2 text-rubber hover:text-plate"><Pencil className="size-4" /></button></td>
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

// ================================================================ قرارداد
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
      setOk(`نسخهٔ ${faNum(r.version)} منتشر شد. ثبت‌نام‌های تازه این نسخه را امضا می‌کنند؛ امضاهای قبلی با نسخهٔ خودشان معتبر می‌مانند.`); setDraft(null); void reload()
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <>
      <PanelTitle title="قرارداد عضویت" sub="قرارداد نسخه‌دار است: ویرایش یعنی انتشار نسخهٔ تازه. متن امضاشدهٔ هر عضو هرگز عوض نمی‌شود.">
        {active && !draft && <Btn className="h-11" onClick={() => setDraft({ title: active.title, clauses: active.clauses.join('\n\n'), questions: active.healthQuestions.join('\n') })}><Pencil className="size-4" aria-hidden />نسخهٔ تازه</Btn>}
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {ok && <Notice tone="ok" className="mb-4">{ok}</Notice>}
      {draft ? (
        <Panel className="grid gap-4">
          <Field label="عنوان"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={sm} /></Field>
          <Field label="بندها (بین هر بند یک خط خالی)"><textarea rows={16} value={draft.clauses} onChange={(e) => setDraft({ ...draft, clauses: e.target.value })} className={`${inputCls} h-auto py-3 leading-8`} /></Field>
          <Field label="پرسش‌های فرم سلامت (هر خط یک پرسش)"><textarea rows={6} value={draft.questions} onChange={(e) => setDraft({ ...draft, questions: e.target.value })} className={`${inputCls} h-auto py-3`} /></Field>
          <div className="flex gap-2"><Btn onClick={publish}>انتشار نسخهٔ تازه</Btn><Btn variant="ghost" onClick={() => setDraft(null)}>انصراف</Btn></div>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {data?.map((c: AdminContract) => (
            <Panel key={c.id} className="p-4 sm:p-5">
              <p className="flex flex-wrap items-center gap-2 text-[16px] font-black text-chalk">نسخهٔ {faNum(c.version)} – {c.title}
                {c.isActive && <span className="rounded-full bg-[#ecf8f1] px-2 py-0.5 text-[11px] text-[#14532d]">فعال</span>}</p>
              <p className="text-[13px] text-rubber">{c.publishedAtUtc ? `انتشار ${jalali(c.publishedAtUtc)}` : ''} – {faNum(c.clauses.length)} بند – {faNum(c.signatures)} امضا</p>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}

// ================================================================ فروشگاه و انبار
const SHOP_STATUS: Record<string, string> = { paid: 'پرداخت‌شده', ready: 'آمادهٔ تحویل', shipped: 'ارسال‌شده', completed: 'تحویل‌شده', cancelled: 'لغو‌شده' }
export function ShopAdmin() {
  const me = usePanel()
  const [tab, setTab] = useState<'orders' | 'stock'>('orders')
  return (
    <>
      <PanelTitle title="فروشگاه و انبار" sub={me.roles.includes('SuperAdmin') ? 'همهٔ شعبه‌ها' : `فقط ${me.branches.map((b) => b.name).join('، ')}`}>
        <div role="tablist" className="inline-flex rounded-[3px] border border-steel-2 bg-white p-0.5">
          {(['orders', 'stock'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn('h-10 cursor-pointer rounded-[2px] px-4 text-[14px] font-bold', tab === t ? 'bg-chalk text-white' : 'text-chalk')}>{t === 'orders' ? 'سفارش‌ها' : 'موجودی و قیمت'}</button>)}
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
      <div className="mb-4 flex gap-2">{[['open', 'باز'], ['done', 'بسته‌شده'], ['', 'همه']].map(([k, l]) => <Chip key={k} on={status === k} onClick={() => setStatus(k)}>{l}</Chip>)}</div>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {rows?.length === 0 && <Panel><p className="text-rubber">سفارشی نیست.</p></Panel>}
      <div className="grid gap-3">
        {rows?.map((o) => (
          <Panel key={o.id} className="p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="font-mono text-[14px] font-bold" dir="ltr">{o.number}</p>
              <span className="rounded-full bg-steel px-2 py-0.5 text-[12px] font-bold">{SHOP_STATUS[o.status] ?? o.status}</span>
              <span className="text-[13px] text-rubber">{o.fulfillment === 'pickup' ? `تحویل حضوری – ${o.branchName}` : 'ارسال پستی'}</span>
              <span className="text-[13px] text-rubber">{jalali(o.createdAtUtc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="ms-auto text-[15px] font-black">{toman(o.totalToman)}</span>
            </div>
            <p className="mt-2 text-[14px]">{o.customerName ?? '—'} <span dir="ltr" className="text-rubber">{faDigits(o.customerPhone)}</span>{o.address && <span className="text-rubber"> – {o.address}</span>}</p>
            <p className="mt-1 text-[13px] text-rubber">{o.items.map((i) => `${rebrand(i.productName)}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${faNum(i.quantity)}`).join('، ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.status === 'paid' && o.fulfillment === 'pickup' && <Btn className="h-10" onClick={() => move(o, 'ready')}>آماده شد</Btn>}
              {o.status === 'paid' && o.fulfillment === 'delivery' && <Btn className="h-10" onClick={() => move(o, 'shipped')}>ارسال شد</Btn>}
              {(o.status === 'ready' || o.status === 'shipped') && <Btn variant="dark" className="h-10" onClick={() => move(o, 'completed')}>تحویل داده شد</Btn>}
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
  const setQty = async (variant: number, v: string) => {
    const n = money(v); if (Number.isNaN(n)) return
    try { await panelApi.setStock(variant, branch, n); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const savePrice = async (p: AdminProduct, patch: { priceToman?: number; isActive?: boolean }) => {
    try { await panelApi.updateProduct(p.id, { priceToman: patch.priceToman ?? p.priceToman, isActive: patch.isActive ?? p.isActive }); setPrice({}); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const list = (data ?? []).filter((p) => !q || rebrand(p.name).includes(q) || p.category.includes(q))
  const superAdmin = me.roles.includes('SuperAdmin')
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <BranchSelect value={branch} onChange={setBranch} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی کالا…" aria-label="جست‌وجوی کالا" className={`${sm} max-w-xs`} />
      </div>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      <div className="grid gap-3">
        {list.map((p) => (
          <Panel key={p.id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <img src={p.imagePath} alt="" className="size-14 rounded-[6px] bg-steel object-contain" />
              <div className="min-w-[180px] flex-1"><p className="font-black text-chalk">{rebrand(p.name)}</p><p className="text-[12px] text-rubber">{p.category}</p></div>
              {superAdmin ? (price[p.id] !== undefined
                ? <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void savePrice(p, { priceToman: money(price[p.id]) }) }}>
                    <input autoFocus dir="ltr" value={price[p.id]} onChange={(e) => setPrice({ [p.id]: e.target.value })} aria-label="قیمت" className={`${sm} w-36 text-left`} /><Btn type="submit" className="h-11">ذخیره</Btn></form>
                : <button type="button" onClick={() => setPrice({ [p.id]: String(p.priceToman) })} className="inline-flex cursor-pointer items-center gap-1 font-black hover:text-plate">{toman(p.priceToman)}<Pencil className="size-3.5" aria-hidden /></button>)
                : <span className="font-black">{toman(p.priceToman)}</span>}
              {superAdmin && <span className="flex items-center gap-2 text-[12px] text-rubber">در سایت<Toggle on={p.isActive} onChange={(v) => savePrice(p, { isActive: v })} label="نمایش در سایت" /></span>}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.variants.map((v) => {
                const s = v.stock.find((x) => x.branchSlug === branch)
                return (
                  <li key={v.id} className={cn('flex items-center gap-2 rounded-[6px] border px-2 py-1 text-[13px]', (s?.quantity ?? 0) === 0 ? 'border-danger/40 bg-[#fdecee]' : (s?.quantity ?? 0) < 3 ? 'border-sun bg-[#fff6e0]' : 'border-steel-2')}>
                    <span className="font-bold">{v.label || 'تک'}</span>
                    <input key={`${v.id}-${branch}-${s?.quantity}`} defaultValue={s?.quantity ?? 0} inputMode="numeric" aria-label={`موجودی ${v.label || p.name}`}
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

// ================================================================ منوی بوفه
export function CanteenMenuAdmin() {
  const me = usePanel()
  const { data, err, setErr, reload } = useList(panelApi.canteenItems)
  const [price, setPrice] = useState<Record<number, string>>({})
  const save = async (i: AdminCanteenItem, patch: { priceToman?: number; isAvailable?: boolean }) => {
    setErr(null)
    try { await panelApi.updateCanteenItem(i.id, { priceToman: patch.priceToman ?? i.priceToman, isAvailable: patch.isAvailable ?? i.isAvailable }); setPrice({}); void reload() } catch (x) { setErr((x as Error).message) }
  }
  const superAdmin = me.roles.includes('SuperAdmin')
  return (
    <>
      <PanelTitle title="منوی بوفه" sub={superAdmin ? 'قیمت و موجود بودن آیتم‌ها؛ منو برای همهٔ شعبه‌ها یکی است.' : 'آیتمی که تمام شد را خاموش کنید تا مشتری سفارشش ندهد. تغییر قیمت با مدیر کل است.'} />
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((i) => (
          <Panel key={i.id} className={cn('flex items-center gap-3 p-3', !i.isAvailable && 'opacity-60')}>
            <img src={i.imagePath} alt="" className="size-14 rounded-[6px] bg-steel object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-chalk">{i.name}</p>
              {superAdmin && price[i.id] !== undefined
                ? <form className="mt-1 flex gap-1" onSubmit={(e) => { e.preventDefault(); void save(i, { priceToman: money(price[i.id]) }) }}>
                    <input autoFocus dir="ltr" value={price[i.id]} onChange={(e) => setPrice({ [i.id]: e.target.value })} aria-label="قیمت" className="h-8 w-28 rounded-[3px] border border-steel-2 px-2 text-left" /><Btn type="submit" className="h-8 px-3 text-[13px]">ذخیره</Btn></form>
                : <button type="button" disabled={!superAdmin} onClick={() => setPrice({ [i.id]: String(i.priceToman) })} className="text-[14px] text-rubber enabled:cursor-pointer enabled:hover:text-plate">{toman(i.priceToman)}</button>}
            </div>
            <Toggle on={i.isAvailable} onChange={(v) => save(i, { isAvailable: v })} label={`${i.name} موجود است`} />
          </Panel>
        ))}
      </div>
    </>
  )
}

// ================================================================ کارکنان
export function StaffAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.staff)
  const { data: branches = [] } = useData('branches', api.branches)
  const [form, setForm] = useState<{ phone: string; fullName: string; roles: string[]; branchSlugs: string[] } | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!form) return; setErr(null); setOk(null)
    try { await panelApi.saveStaff({ ...form, phone: toLatinDigits(form.phone), fullName: form.fullName || null }); setOk('ذخیره شد؛ دسترسی همین حالا اعمال شد.'); setForm(null); void reload() }
    catch (x) { setErr((x as Error).message) }
  }
  const tog = (l: string[], v: string) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v])
  return (
    <>
      <PanelTitle title="کارکنان و دسترسی" sub="کارمند با همان شمارهٔ موبایل و کد پیامکی وارد می‌شود. مدیر شعبه، پذیرش، بوفه و فروشگاه فقط شعبه‌های انتخاب‌شده را می‌بینند.">
        <Btn className="h-11" onClick={() => setForm({ phone: '', fullName: '', roles: ['Reception'], branchSlugs: [] })}><Plus className="size-4" aria-hidden />کارمند تازه</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {ok && <Notice tone="ok" className="mb-4">{ok}</Notice>}
      {form && (
        <Panel className="mb-5">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="موبایل"><input required dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${sm} text-left`} /></Field>
            <Field label="نام"><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={sm} /></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-[13px] font-bold">نقش‌ها (همه را بردارید = گرفتن دسترسی)</legend>
              <div className="flex flex-wrap gap-2">{STAFF_ROLES.map((r) => <Chip key={r} on={form.roles.includes(r)} onClick={() => setForm({ ...form, roles: tog(form.roles, r) })}>{ROLE_LABEL[r]}</Chip>)}</div></fieldset>
            {!form.roles.includes('SuperAdmin') && (
              <fieldset className="sm:col-span-2"><legend className="mb-2 text-[13px] font-bold">شعبه‌ها</legend>
                <div className="flex flex-wrap gap-2">{branches.map((b) => <Chip key={b.slug} on={form.branchSlugs.includes(b.slug)} onClick={() => setForm({ ...form, branchSlugs: tog(form.branchSlugs, b.slug) })}>{b.name}</Chip>)}</div></fieldset>
            )}
            <div className="flex gap-2 sm:col-span-2"><Btn type="submit">ذخیره</Btn><Btn type="button" variant="ghost" onClick={() => setForm(null)}>انصراف</Btn></div>
          </form>
        </Panel>
      )}
      <div className="overflow-x-auto rounded-[6px] border border-steel-2 bg-white">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead><tr className="border-b border-steel-2 bg-steel text-[13px] text-rubber"><th className="px-4 py-2.5 text-right">نام</th><th className="text-right">نقش</th><th className="text-right">شعبه</th><th>آخرین ورود</th><th><span className="sr-only">عملیات</span></th></tr></thead>
          <tbody>
            {data?.map((s: StaffRow) => (
              <tr key={s.userId} className="border-b border-steel-2/60 last:border-0">
                <td className="px-4 py-2.5"><b>{s.fullName ?? '—'}</b><span dir="ltr" className="block text-right text-[12px] text-rubber">{faDigits(s.phone)}</span></td>
                <td className="text-[13px]">{s.roles.map((r) => ROLE_LABEL[r] ?? r).join('، ')}</td>
                <td className="max-w-[260px] text-[12px] text-rubber">{s.roles.includes('SuperAdmin') ? 'همه' : s.branches.map((b) => b.name).join('، ') || '—'}</td>
                <td className="text-center text-[12px] text-rubber">{s.lastLoginAtUtc ? jalali(s.lastLoginAtUtc) : '—'}</td>
                <td className="flex gap-1 px-2 py-2.5">
                  <button type="button" aria-label="ویرایش" onClick={() => setForm({ phone: s.phone, fullName: s.fullName ?? '', roles: s.roles.filter((r) => ROLE_LABEL[r]), branchSlugs: s.branches.map((b) => b.slug) })} className="cursor-pointer p-2 text-rubber hover:text-plate"><Pencil className="size-4" /></button>
                  <button type="button" aria-label="گرفتن دسترسی" onClick={() => setForm({ phone: s.phone, fullName: s.fullName ?? '', roles: [], branchSlugs: [] })} className="cursor-pointer p-2 text-rubber hover:text-danger"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ================================================================ پیامک‌ها
const SMS_KIND: Record<string, string> = { welcome: 'خوش‌آمد', reminder7: 'یادآوری ۷ روز', reminder1: 'یادآوری ۱ روز', birthday: 'تولد', campaign: 'جشنواره', custom: 'سایر' }
export function SmsAdmin() {
  const [kind, setKind] = useState('')
  const [d, setD] = useState<SmsStats | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(() => panelApi.sms(kind || undefined).then(setD).catch(() => null), [kind])
  useEffect(() => { void load() }, [load])
  const run = async () => { const r = await panelApi.runSms(); setMsg(`${faNum(r.scheduled)} پیامک تازه در صف، ${faNum(r.sent)} ارسال شد.`); void load() }
  return (
    <>
      <PanelTitle title="پیامک‌ها" sub="خوش‌آمد بلافاصله؛ یادآوری‌ها، تولد و جشنواره فقط ۹ صبح تا ۹ شب. هر پیامک فقط یک بار به هر نفر می‌رسد.">
        <Btn variant="ghost" className="h-11" onClick={run}>بررسی و ارسال همین حالا</Btn>
      </PanelTitle>
      {msg && <Notice tone="ok" className="mb-4">{msg}</Notice>}
      {d && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[['در صف', d.queued], ['ارسال امروز', d.sentToday], ['ناموفق', d.failed]].map(([l, v]) => (
            <div key={l} className="rounded-[8px] border border-steel-2 bg-white p-4"><p className="text-[13px] text-rubber">{l}</p><p className="text-[24px] font-black">{faNum(v as number)}</p></div>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2"><Chip on={!kind} onClick={() => setKind('')}>همه</Chip>{Object.entries(SMS_KIND).slice(0, 5).map(([k, l]) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{l}</Chip>)}</div>
      <div className="grid gap-2">
        {d?.recent.map((s) => (
          <div key={s.id} className="rounded-[6px] border border-steel-2 bg-white p-3">
            <p className="flex flex-wrap items-center gap-2 text-[12px] text-rubber">
              <span className="rounded-full bg-steel px-2 py-0.5 font-bold text-chalk">{SMS_KIND[s.kind] ?? s.kind}</span>
              <span dir="ltr">{faDigits(s.phone)}</span>
              <span className={cn('font-bold', s.status === 'sent' ? 'text-[#1f7a46]' : s.status === 'failed' ? 'text-danger' : 'text-[#7a5600]')}>{s.status === 'sent' ? 'ارسال شد' : s.status === 'failed' ? 'ناموفق' : 'در صف'}</span>
              <span className="ms-auto">{jalali(s.sentAtUtc ?? s.createdAtUtc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <p className="mt-1 text-[14px] leading-7 text-chalk">{rebrand(s.preview)}</p>
            {s.error && <p className="text-[12px] text-danger">{s.error}</p>}
          </div>
        ))}
      </div>
    </>
  )
}
