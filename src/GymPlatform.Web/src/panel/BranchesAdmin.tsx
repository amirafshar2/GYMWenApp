import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, LocateFixed, MapPin, Pencil, Plus } from 'lucide-react'
import { panelApi, type AdminBranch, type AdminFaq, type SaveBranch } from '@/lib/panel'
import { reloadSite } from '@/lib/site'
import { faDigits, faNum } from '@/lib/fa'
import { cn } from '@/lib/utils'
import { Btn, inputCls, Notice, Panel, Spinner, toLatinDigits } from '@/member/ui'
import { PanelTitle } from './PanelLayout'
import { DeleteButton, Drawer, errText, Field, SECTIONS } from './CatalogForms'

const sm = `${inputCls} h-11`

function useList<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const reload = useCallback(() => load().then(setData).catch((e: Error) => setErr(e.message)), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, [reload])
  return { data, err, setErr, reload }
}

/** «۲۹٫۶۱۲۳, ۵۲٫۵۳۱» یا لینک گوگل‌مپ/نشان/بلد → [lat, lng] */
export function parseLocation(text: string): [number, number] | null {
  const t = toLatinDigits(text).replace(/٫/g, '.')
  const m = /(-?\d{1,2}\.\d+)[,\s/]+(-?\d{1,3}\.\d+)/.exec(t) ?? /latitude=(-?\d+\.\d+).*longitude=(-?\d+\.\d+)/.exec(t)
  return m ? [Number(m[1]), Number(m[2])] : null
}

// ================================================================ شعبه‌ها
export function BranchesAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.branches)
  const [form, setForm] = useState<AdminBranch | 'new' | null>(null)
  const done = async () => { setForm(null); await reload(); await reloadSite() }
  const move = async (i: number, d: -1 | 1) => {
    if (!data) return
    const l = [...data]; const j = i + d
    if (j < 0 || j >= l.length) return
    ;[l[i], l[j]] = [l[j], l[i]]
    try { await panelApi.reorderBranches(l.map((b) => b.id)); await reload() } catch (e) { setErr((e as Error).message) }
  }
  return (
    <>
      <PanelTitle title="شعبه‌ها" sub="آدرس، موقعیت روی نقشه، سالن آقایان/بانوان، ساعت سانس و رشته‌های هر شعبه.">
        <Btn className="h-11" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />شعبهٔ تازه</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {form && <BranchForm branch={form === 'new' ? null : form} onCancel={() => setForm(null)} onDone={done} />}
      {!data ? <Spinner /> : data.length === 0 ? (
        <Panel className="p-8 text-center">
          <MapPin className="mx-auto size-8 text-plate" aria-hidden />
          <p className="mt-3 text-[16px] font-black text-chalk">هنوز شعبه‌ای ثبت نشده</p>
          <p className="mt-1 text-[14px] text-rubber">اولین شعبه را اضافه کنید؛ بدون شعبه، ثبت‌نام آنلاین ممکن نیست.</p>
          <Btn className="mt-5" onClick={() => setForm('new')}><Plus className="size-4" aria-hidden />افزودن اولین شعبه</Btn>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {data.map((b, i) => (
            <Panel key={b.id} className={cn('flex flex-wrap items-center gap-3 p-4', !b.isActive && 'opacity-60')}>
              <div className="flex flex-col">
                <button type="button" aria-label="بالاتر" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-steel disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button type="button" aria-label="پایین‌تر" disabled={i === data.length - 1} onClick={() => move(i, 1)} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-steel disabled:opacity-30"><ArrowDown className="size-4" /></button>
              </div>
              <div className="min-w-[200px] flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[16px] font-black text-chalk">{b.name}
                  {!b.isActive && <span className="rounded-full bg-steel px-2 py-0.5 text-[11px] text-rubber">در سایت نیست</span>}</p>
                <p className="text-[13px] text-rubber">{b.district} – {SECTIONS.find(([k]) => k === b.section)?.[1]} – {b.address}</p>
                <p className="mt-1 text-[12px] text-rubber">{faNum(b.memberships)} عضویت ثبت‌شده{b.phone && <> – <span dir="ltr">{faDigits(b.phone)}</span></>}</p>
              </div>
              <button type="button" onClick={() => setForm(b)} className="inline-flex cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Pencil className="size-4" aria-hidden />ویرایش</button>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}

function BranchForm({ branch, onDone, onCancel }: { branch: AdminBranch | null; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState<SaveBranch>(branch ?? {
    name: '', district: '', address: '', phone: '', latitude: 0, longitude: 0, section: 'both', menHours: '', womenHours: '', disciplines: [], isActive: true,
  })
  const [loc, setLoc] = useState(branch ? `${branch.latitude}, ${branch.longitude}` : '')
  const [disc, setDisc] = useState((branch?.disciplines ?? []).join('، '))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [geo, setGeo] = useState<string | null>(null)

  const here = () => {
    if (!navigator.geolocation) return setGeo('مرورگر موقعیت‌یابی ندارد.')
    setGeo('در حال پیدا کردن…')
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`); setGeo('موقعیت فعلی شما ثبت شد (اگر الان داخل شعبه هستید).') },
      () => setGeo('موقعیت پیدا نشد؛ از نقشه کپی کنید.'), { enableHighAccuracy: true, timeout: 12000 })
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const p = parseLocation(loc)
    if (!p) return setErr('موقعیت را مثل «۲۹٫۶۱۲۳, ۵۲٫۵۳۱» وارد کنید (در گوگل‌مپ یا نشان روی نقطه نگه دارید و مختصات را کپی کنید).')
    setBusy(true)
    try {
      await panelApi.saveBranch(branch?.id ?? null, {
        ...f, latitude: p[0], longitude: p[1], phone: f.phone ? toLatinDigits(f.phone) : null,
        disciplines: disc.split(/[،,]/).map((x) => x.trim()).filter(Boolean),
      })
      onDone()
    } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
  }
  return (
    <Drawer title={branch ? `ویرایش ${branch.name}` : 'شعبهٔ تازه'} onClose={onCancel}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="نام شعبه"><input className={sm} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} placeholder="شعبهٔ مرکزی" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="محله / منطقه"><input className={sm} value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} maxLength={60} /></Field>
          <Field label="تلفن شعبه"><input className={sm} dir="ltr" value={f.phone ?? ''} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={14} /></Field>
        </div>
        <Field label="آدرس کامل"><textarea className={cn(inputCls, 'py-2.5')} rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} maxLength={300} /></Field>
        <Field label="موقعیت روی نقشه" hint="در گوگل‌مپ، نشان یا بلد روی محل شعبه نگه دارید و مختصات را کپی کنید؛ برای «نزدیک‌ترین شعبه» و مسیریابی لازم است.">
          <span className="flex gap-2">
            <input className={sm} dir="ltr" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="29.6123, 52.5310" />
            <Btn type="button" variant="ghost" className="h-11 shrink-0" onClick={here}><LocateFixed className="size-4" aria-hidden />همین‌جا</Btn>
          </span>
        </Field>
        {geo && <p className="text-[12px] text-rubber">{geo}</p>}
        <Field label="سالن">
          <select className={cn(sm, 'cursor-pointer')} value={f.section} onChange={(e) => setF({ ...f, section: e.target.value as SaveBranch['section'] })}>
            {SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {f.section !== 'women' && <Field label="سانس آقایان" hint="مثل «شنبه تا پنجشنبه ۶ تا ۱۴»"><input className={sm} value={f.menHours ?? ''} onChange={(e) => setF({ ...f, menHours: e.target.value })} maxLength={120} /></Field>}
          {f.section !== 'men' && <Field label="سانس بانوان"><input className={sm} value={f.womenHours ?? ''} onChange={(e) => setF({ ...f, womenHours: e.target.value })} maxLength={120} /></Field>}
        </div>
        <Field label="رشته‌ها" hint="با «،» جدا کنید: بدنسازی، کراس‌فیت، یوگا"><input className={sm} value={disc} onChange={(e) => setDisc(e.target.value)} /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-bold text-chalk">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-5 accent-[var(--color-plate)]" />نمایش در سایت
        </label>
        {err && <Notice tone="err">{err}</Notice>}
        <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center gap-2 border-t border-steel-2 bg-white px-5 pt-4">
          <Btn type="submit" busy={busy}>ذخیره</Btn>
          <Btn type="button" variant="ghost" onClick={onCancel}>انصراف</Btn>
          {branch && <span className="ms-auto"><DeleteButton onDelete={async () => { try { await panelApi.deleteBranch(branch.id); onDone() } catch (x) { setErr(errText(x)) } }} /></span>}
        </div>
      </form>
    </Drawer>
  )
}

// ================================================================ سؤالات پرتکرار
export function FaqAdmin() {
  const { data, err, setErr, reload } = useList(panelApi.faq)
  const [edit, setEdit] = useState<AdminFaq | 'new' | null>(null)
  const move = async (i: number, d: -1 | 1) => {
    if (!data) return
    const j = i + d
    if (j < 0 || j >= data.length) return
    try {
      await panelApi.saveFaq(data[i].id, { question: data[i].question, answer: data[i].answer, sortOrder: data[j].sortOrder })
      await panelApi.saveFaq(data[j].id, { question: data[j].question, answer: data[j].answer, sortOrder: data[i].sortOrder })
      await reload()
    } catch (e) { setErr((e as Error).message) }
  }
  return (
    <>
      <PanelTitle title="سؤالات پرتکرار" sub="در بخش «سؤال‌های رایج» صفحهٔ اصلی نمایش داده می‌شود.">
        <Btn className="h-11" onClick={() => setEdit('new')}><Plus className="size-4" aria-hidden />سؤال تازه</Btn>
      </PanelTitle>
      {err && <Notice tone="err" className="mb-4">{err}</Notice>}
      {edit && <FaqForm item={edit === 'new' ? null : edit} onCancel={() => setEdit(null)} onDone={() => { setEdit(null); void reload() }} />}
      {!data ? <Spinner /> : data.length === 0 ? <Panel className="p-6 text-center text-[14px] text-rubber">هنوز سؤالی نیست؛ تا اضافه نکنید، این بخش در سایت دیده نمی‌شود.</Panel> : (
        <div className="grid gap-3">
          {data.map((q, i) => (
            <Panel key={q.id} className="flex items-start gap-3 p-4">
              <div className="flex flex-col">
                <button type="button" aria-label="بالاتر" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-steel disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button type="button" aria-label="پایین‌تر" disabled={i === data.length - 1} onClick={() => move(i, 1)} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-steel disabled:opacity-30"><ArrowDown className="size-4" /></button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black text-chalk">{q.question}</p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-rubber">{q.answer}</p>
              </div>
              <button type="button" onClick={() => setEdit(q)} className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[14px] font-bold text-plate hover:underline"><Pencil className="size-4" aria-hidden />ویرایش</button>
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}

function FaqForm({ item, onDone, onCancel }: { item: AdminFaq | null; onDone: () => void; onCancel: () => void }) {
  const [q, setQ] = useState(item?.question ?? '')
  const [a, setA] = useState(item?.answer ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <Drawer title={item ? 'ویرایش سؤال' : 'سؤال تازه'} onClose={onCancel}>
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null)
        try { await panelApi.saveFaq(item?.id ?? null, { question: q, answer: a, sortOrder: item?.sortOrder }); onDone() } catch (x) { setErr(errText(x)) } finally { setBusy(false) }
      }}>
        <Field label="سؤال"><input className={sm} value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} /></Field>
        <Field label="جواب"><textarea className={cn(inputCls, 'py-2.5 leading-7')} rows={6} value={a} onChange={(e) => setA(e.target.value)} maxLength={1500} /></Field>
        {err && <Notice tone="err">{err}</Notice>}
        <div className="flex flex-wrap items-center gap-2">
          <Btn type="submit" busy={busy}>ذخیره</Btn>
          <Btn type="button" variant="ghost" onClick={onCancel}>انصراف</Btn>
          {item && <span className="ms-auto"><DeleteButton onDelete={async () => { try { await panelApi.deleteFaq(item.id); onDone() } catch (x) { setErr(errText(x)) } }} /></span>}
        </div>
      </form>
    </Drawer>
  )
}
