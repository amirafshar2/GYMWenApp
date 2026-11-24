import { useEffect, useId, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Check, Clock, Loader2, MapPin, Phone, ShieldCheck, X } from 'lucide-react'
import { Instagram } from '@/components/ui/brand-icons'
import { api, ApiError } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faDigits, faNum } from '@/lib/fa'
import { fill, site, splitAccent } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Eyebrow, useFadeUp, wrap } from './ui/SectionHead'

/** Dieselbe erlaubte Liste wie auf dem Server (CreateConsultationValidator.AllowedGoals) */
const GOALS = ['Abnehmen', 'Muskelaufbau', 'Fitness', 'Kraft', 'Klettern', 'Sonstiges']
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[\s-]/g, '')

type Status = { s: 'idle' | 'busy' | 'ok' | 'err'; msg?: string; fields?: Record<string, string> }

const input = 'h-[52px] w-full rounded-[3px] border border-steel-2 bg-white px-4 text-[15px] text-chalk outline-none transition-colors placeholder:text-rubber/60 hover:border-chalk/30 focus:border-plate focus:ring-2 focus:ring-plate/15 aria-[invalid=true]:border-danger'

/** Kostenlose Beratung: dunkler Bereich mit Studiobild, Kontaktdaten und weißem Formular im Stil der Seite */
export default function SiteContact() {
  const { data: branches = [] } = useData('branches', api.branches)
  const { data: pkgs = [] } = useData('packages', api.packages)
  const uid = useId()
  const fadeA = useFadeUp()
  const fadeB = useFadeUp(0.15)
  const sec = site.home.contact
  const [title, accent] = splitAccent(sec.title)

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [branchId, setBranchId] = useState('')
  const [message, setMessage] = useState('')
  const [pkg, setPkg] = useState<string | null>(null)
  const [st, setSt] = useState<Status>({ s: 'idle' })

  // Im Preisbereich gewähltes Paket
  useEffect(() => {
    const read = () => { try { setPkg(sessionStorage.getItem('chosen-package')) } catch { /* */ } }
    read()
    window.addEventListener('kg:package', read)
    return () => window.removeEventListener('kg:package', read)
  }, [])
  const pkgName = pkg ? pkgs.find((p) => p.slug === pkg)?.name : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const fields: Record<string, string> = {}
    const m = toLatin(mobile)
    if (name.trim().length < 3) fields.name = 'Bitte Vor- und Nachnamen vollständig angeben.'
    if (!/^(\+49|0049|0)?1[5-7]\d{8,9}$/.test(m)) fields.mobile = 'Bitte die Handynummer im Format 01512 3456789 eingeben.'
    if (Object.keys(fields).length) return setSt({ s: 'err', msg: Object.values(fields)[0], fields })
    setSt({ s: 'busy' })
    try {
      const note = [pkgName && `Gewähltes Paket: ${pkgName}`, message.trim()].filter(Boolean).join('\n')
      await api.consult({ fullName: name.trim(), mobile: m, goal, message: note || null, branchId: Number(branchId) || null })
      setSt({ s: 'ok', msg: 'Anfrage gesendet. Unser Team meldet sich in Kürze bei Ihnen.' })
      setName(''); setMobile(''); setMessage(''); setGoal(null)
    } catch (err) {
      const ae = err as ApiError
      const first = ae.errors ? Object.values(ae.errors)[0]?.[0] : undefined
      setSt({ s: 'err', msg: first ?? ae.message ?? 'Nicht gesendet. Bitte erneut versuchen.' })
    }
  }

  return (
    <section id="consult" aria-labelledby="consult-title" className="relative isolate overflow-hidden bg-night py-[clamp(80px,9vw,130px)] text-white">
      <img src="/media/gallery/hall-light.webp" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_left,#181818_10%,rgb(24_24_24/.85)_45%,rgb(24_24_24/.55))]" />

      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20`}>
        <motion.div {...fadeA}>
          {sec.eyebrow && <Eyebrow className="text-plate-lt">{fill(sec.eyebrow)}</Eyebrow>}
          <h2 id="consult-title" className="mt-3 text-[clamp(2rem,3.8vw,3.4rem)] font-black leading-[1.25]">
            {title}{accent && <><br />{accent}</>}
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-8 text-white/70">{fill(sec.text)}</p>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {brand.phone && <li>
              <a href={`tel:${brand.phone}`} className="group flex items-center gap-4 rounded-[4px] border border-white/10 bg-white/[.04] p-4 transition-colors hover:border-plate hover:bg-plate">
                <span className="grid size-11 place-items-center rounded-full bg-plate text-white transition-colors group-hover:bg-white group-hover:text-plate"><Phone className="size-5" aria-hidden /></span>
                <span><span className="block text-[12px] text-white/60 group-hover:text-white/80">Direkter Kontakt</span><span dir="ltr" className="block text-[17px] font-bold">{faDigits(brand.phone)}</span></span>
              </a>
            </li>}
            <li className="flex items-center gap-4 rounded-[4px] border border-white/10 bg-white/[.04] p-4">
              <span className="grid size-11 place-items-center rounded-full bg-white/10"><Clock className="size-5" aria-hidden /></span>
              <span><span className="block text-[12px] text-white/60">Erreichbarkeit</span><span className="block text-[15px] font-bold">{site.contact.responseTime || 'meist am selben Tag'}</span></span>
            </li>
            <li className="flex items-center gap-4 rounded-[4px] border border-white/10 bg-white/[.04] p-4">
              <span className="grid size-11 place-items-center rounded-full bg-white/10"><MapPin className="size-5" aria-hidden /></span>
              <span><span className="block text-[12px] text-white/60">{brand.city}</span><span className="block text-[15px] font-bold">{faNum(branches.length)} {branches.length === 1 ? 'Filiale' : 'Filialen'}{site.home.footerNote ? ` – ${fill(site.home.footerNote)}` : ''}</span></span>
            </li>
            {brand.instagram && (
              <li>
                <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-[4px] border border-white/10 bg-white/[.04] p-4 transition-colors hover:border-white/30">
                  <span className="grid size-11 place-items-center rounded-full bg-white/10"><Instagram className="size-5" /></span>
                  <span><span className="block text-[12px] text-white/60">Instagram</span><span className="block text-[15px] font-bold">Direktnachricht senden</span></span>
                </a>
              </li>
            )}
          </ul>
        </motion.div>

        <motion.form {...fadeB} onSubmit={submit} noValidate
          className="rounded-[6px] bg-white p-6 text-chalk shadow-[0_40px_80px_-30px_rgb(0_0_0/.6)] sm:p-9">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[22px] font-black">Beratungsformular</h3>
            <span className="flex items-center gap-1.5 text-[12px] text-rubber"><ShieldCheck className="size-4 text-plate" aria-hidden />Deine Daten bleiben vertraulich</span>
          </div>

          {pkgName && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-[3px] border border-plate/30 bg-plate/[.06] px-4 py-3 text-[14px]">
              <span><span className="text-rubber">Gewähltes Paket: </span><b>{pkgName}</b></span>
              <button type="button" aria-label="Gewähltes Paket entfernen" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-plate/10"
                onClick={() => { try { sessionStorage.removeItem('chosen-package') } catch { /* */ } setPkg(null) }}><X className="size-4" aria-hidden /></button>
            </div>
          )}

          <fieldset className="mt-6">
            <legend className="mb-3 text-[14px] font-bold">Was ist dein Ziel? <span className="font-normal text-rubber">(optional)</span></legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? null : g)}
                  className={cn('inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold transition-colors',
                    goal === g ? 'border-plate bg-plate text-white' : 'border-steel-2 bg-white text-chalk hover:border-chalk/40')}>
                  {goal === g && <Check className="size-4" aria-hidden />}{g}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label htmlFor={`${uid}-name`} className="grid gap-2 text-[14px] font-bold">
              Vor- und Nachname
              <input id={`${uid}-name`} className={input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
                aria-invalid={!!st.fields?.name} placeholder="z. B. Sarah Becker" />
            </label>
            <label htmlFor={`${uid}-mobile`} className="grid gap-2 text-[14px] font-bold">
              Handynummer
              <input id={`${uid}-mobile`} className={cn(input, 'text-left')} type="tel" inputMode="numeric" autoComplete="tel" dir="ltr"
                value={mobile} onChange={(e) => setMobile(e.target.value)} aria-invalid={!!st.fields?.mobile} placeholder="01512 3456789" />
            </label>
          </div>

          <label htmlFor={`${uid}-branch`} className="mt-5 grid gap-2 text-[14px] font-bold">
            Gewünschte Filiale
            <select id={`${uid}-branch`} className={cn(input, 'cursor-pointer appearance-none bg-[length:16px] bg-[left_14px_center] bg-no-repeat pr-10')}
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
              value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Egal — bitte die nächste vorschlagen</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label htmlFor={`${uid}-msg`} className="mt-5 grid gap-2 text-[14px] font-bold">
            <span>Beschreibung <span className="font-normal text-rubber">(optional)</span></span>
            <textarea id={`${uid}-msg`} rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
              className={cn(input, 'h-auto resize-none py-3 leading-7')} placeholder="z. B. abends passt mir am besten" />
          </label>

          <button type="submit" disabled={st.s === 'busy'}
            className="mt-7 inline-flex h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] bg-plate text-[16px] font-bold text-white transition-colors hover:bg-plate-hi disabled:cursor-wait disabled:opacity-70">
            {st.s === 'busy' && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Beratung anfragen
          </button>

          <div className="mt-4 min-h-6 text-[14px]">
            {st.s === 'ok' && <p role="status" className="flex items-center gap-2 font-bold text-[#178a4c]"><Check className="size-4" aria-hidden />{st.msg}</p>}
            {st.s === 'err' && <p role="alert" className="font-bold text-danger">{st.msg}</p>}
          </div>
        </motion.form>
      </div>
    </section>
  )
}
