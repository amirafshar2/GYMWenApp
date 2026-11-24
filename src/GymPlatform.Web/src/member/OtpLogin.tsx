import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, MessageSquareText } from 'lucide-react'
import { authApi, ApiError, type User } from '@/lib/api'
import { site } from '@/lib/site'
import { faDigits, faNum } from '@/lib/fa'
import { Btn, inputCls, Notice, toLatinDigits } from './ui'

/** Sekunden-Countdown für „Erneut senden“ */
export function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, setLeft] as const
}

/** Feld für den 5-stelligen SMS-Code; autocomplete=one-time-code, damit das Handy den Code vorschlägt */
export function CodeField({ value, onChange, id, invalid, describedBy }: { value: string; onChange: (v: string) => void; id: string; invalid?: boolean; describedBy?: string }) {
  return (
    <input id={id} value={value} onChange={(e) => onChange(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
      inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={5} placeholder="– – – – –" autoFocus
      aria-invalid={invalid || undefined} aria-describedby={describedBy}
      className={`${inputCls} text-center text-[24px] font-bold tracking-[.6em]`} />
  )
}

/** Zweistufiger Login: Handy → SMS-Code. Im Demo-Modus wird der Code auf der Seite angezeigt. */
/** Demo-Version: keine Eingabe von Daten – Anmeldung als Demo-Mitglied mit einem Klick */
export const DEMO_MEMBER_PHONE = '01521000001'
function DemoMemberLogin({ onDone }: { onDone: (u: User) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const go = async () => {
    setBusy(true); setErr(null)
    try { onDone((await authApi.demoLogin(DEMO_MEMBER_PHONE)).user) }
    catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  return (
    <div className="grid gap-3">
      <p className="text-[13.5px] text-rubber">In der Demo-Version werden keine persönlichen Daten abgefragt. Sie melden sich mit einem Klick als Demo-Mitglied an.</p>
      <Btn type="button" onClick={() => void go()} disabled={busy}>{busy ? 'Anmeldung läuft…' : 'Als Demo-Mitglied anmelden'}</Btn>
      {err && <Notice tone="err">{err}</Notice>}
    </div>
  )
}

export default function OtpLogin(props: { onDone: (u: User) => void; compact?: boolean }) {
  if (site.demo) return <DemoMemberLogin onDone={props.onDone} />
  return <PhoneOtpLogin {...props} />
}

function PhoneOtpLogin({ onDone, compact }: { onDone: (u: User) => void; compact?: boolean }) {
  const uid = useId()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [demo, setDemo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [left, setLeft] = useCountdown()
  const codeRef = useRef<HTMLDivElement>(null)

  const normalized = toLatinDigits(phone).replace(/[\s-]/g, '')
  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!/^(\+49|0049|0)?1[5-7]\d{8,9}$/.test(normalized)) return setErr('Bitte die Handynummer im Format 01512 3456789 eingeben.')
    setBusy(true); setErr(null)
    try {
      const r = await authApi.sendOtp(normalized)
      setDemo(r.demoCode); setLeft(r.resendInSeconds); setStep('code'); setCode('')
    } catch (x) { setErr((x as ApiError).field?.('phoneNumber') ?? (x as Error).message) }
    finally { setBusy(false) }
  }

  const verify = async (e?: FormEvent) => {
    e?.preventDefault()
    if (code.length !== 5) return setErr('Bitte den 5-stelligen Code aus der SMS eingeben.')
    setBusy(true); setErr(null)
    try { onDone((await authApi.verify(normalized, code)).user) }
    catch (x) { setErr((x as ApiError).field?.('code') ?? (x as Error).message) }
    finally { setBusy(false) }
  }

  // Automatisch anmelden, sobald die fünfte Ziffer eingegeben ist
  useEffect(() => { if (step === 'code' && code.length === 5 && !busy) void verify() }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  return step === 'phone' ? (
    <form onSubmit={send} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor={`${uid}-m`} className="text-[14px] font-bold text-chalk">Handynummer</label>
        <input id={`${uid}-m`} type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="01512 3456789" autoFocus={!compact}
          value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err || undefined} aria-describedby={`${uid}-e`}
          className={`${inputCls} text-left text-[17px]`} />
        <p className="text-[13px] text-rubber">Der Login-Code kommt per SMS. Ein separates Konto ist nicht nötig; der erste Login ist die Anmeldung.</p>
      </div>
      {err && <p id={`${uid}-e`} role="alert" className="text-[14px] text-danger">{err}</p>}
      <Btn type="submit" busy={busy}><MessageSquareText className="size-5" aria-hidden />Login-Code anfordern</Btn>
    </form>
  ) : (
    <form onSubmit={verify} noValidate className="grid gap-4">
      <div ref={codeRef} className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${uid}-c`} className="text-[14px] font-bold text-chalk">Code gesendet an <span dir="ltr">{faDigits(normalized)}</span></label>
          <button type="button" onClick={() => { setStep('phone'); setErr(null) }} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-plate hover:underline">
            <ArrowLeft className="size-4" aria-hidden />Nummer ändern
          </button>
        </div>
        <CodeField id={`${uid}-c`} value={code} onChange={setCode} invalid={!!err} describedBy={`${uid}-e`} />
      </div>
      {demo && (
        <Notice tone="warn">
          <b>Demo-Modus:</b> Es wird keine echte SMS gesendet. Ihr Code: <b dir="ltr" className="text-[17px] tracking-widest">{faDigits(demo)}</b>
        </Notice>
      )}
      {err && <p id={`${uid}-e`} role="alert" className="text-[14px] text-danger">{err}</p>}
      <Btn type="submit" busy={busy}>Anmelden</Btn>
      <p className="text-center text-[13px] text-rubber">
        {left > 0 ? <>Erneut senden in {faNum(left)} Sekunden</> :
          <button type="button" onClick={() => void send()} className="cursor-pointer font-bold text-plate hover:underline">Code erneut senden</button>}
      </p>
    </form>
  )
}
