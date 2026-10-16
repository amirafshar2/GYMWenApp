import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, MessageSquareText } from 'lucide-react'
import { authApi, ApiError, type User } from '@/lib/api'
import { faDigits, faNum } from '@/lib/fa'
import { Btn, inputCls, Notice, toLatinDigits } from './ui'

/** شمارش معکوس ثانیه‌ای برای «ارسال دوباره» */
export function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, setLeft] as const
}

/** فیلد کد پیامکی ۵ رقمی؛ autocomplete=one-time-code تا گوشی کد را خودش پیشنهاد دهد */
export function CodeField({ value, onChange, id, invalid, describedBy }: { value: string; onChange: (v: string) => void; id: string; invalid?: boolean; describedBy?: string }) {
  return (
    <input id={id} value={value} onChange={(e) => onChange(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
      inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={5} placeholder="– – – – –" autoFocus
      aria-invalid={invalid || undefined} aria-describedby={describedBy}
      className={`${inputCls} text-center text-[24px] font-bold tracking-[.6em]`} />
  )
}

/** ورود دومرحله‌ای: موبایل ← کد پیامکی. در حالت دمو کد روی صفحه نمایش داده می‌شود. */
export default function OtpLogin({ onDone, compact }: { onDone: (u: User) => void; compact?: boolean }) {
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
    if (!/^(\+98|0098|0)?9\d{9}$/.test(normalized)) return setErr('شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.')
    setBusy(true); setErr(null)
    try {
      const r = await authApi.sendOtp(normalized)
      setDemo(r.demoCode); setLeft(r.resendInSeconds); setStep('code'); setCode('')
    } catch (x) { setErr((x as ApiError).field?.('phoneNumber') ?? (x as Error).message) }
    finally { setBusy(false) }
  }

  const verify = async (e?: FormEvent) => {
    e?.preventDefault()
    if (code.length !== 5) return setErr('کد ۵ رقمی پیامک‌شده را وارد کنید.')
    setBusy(true); setErr(null)
    try { onDone((await authApi.verify(normalized, code)).user) }
    catch (x) { setErr((x as ApiError).field?.('code') ?? (x as Error).message) }
    finally { setBusy(false) }
  }

  // ورود خودکار وقتی رقم پنجم وارد شد
  useEffect(() => { if (step === 'code' && code.length === 5 && !busy) void verify() }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  return step === 'phone' ? (
    <form onSubmit={send} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor={`${uid}-m`} className="text-[14px] font-bold text-chalk">شمارهٔ موبایل</label>
        <input id={`${uid}-m`} type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲۳۴۵۶۷۸۹" autoFocus={!compact}
          value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err || undefined} aria-describedby={`${uid}-e`}
          className={`${inputCls} text-right text-[17px]`} />
        <p className="text-[13px] text-rubber">کد ورود با پیامک فرستاده می‌شود. حساب جدا لازم نیست؛ اولین ورود یعنی ثبت‌نام.</p>
      </div>
      {err && <p id={`${uid}-e`} role="alert" className="text-[14px] text-danger">{err}</p>}
      <Btn type="submit" busy={busy}><MessageSquareText className="size-5" aria-hidden />دریافت کد ورود</Btn>
    </form>
  ) : (
    <form onSubmit={verify} noValidate className="grid gap-4">
      <div ref={codeRef} className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`${uid}-c`} className="text-[14px] font-bold text-chalk">کد پیامک‌شده به <span dir="ltr">{faDigits(normalized)}</span></label>
          <button type="button" onClick={() => { setStep('phone'); setErr(null) }} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-plate hover:underline">
            <ArrowRight className="size-4" aria-hidden />تغییر شماره
          </button>
        </div>
        <CodeField id={`${uid}-c`} value={code} onChange={setCode} invalid={!!err} describedBy={`${uid}-e`} />
      </div>
      {demo && (
        <Notice tone="warn">
          <b>حالت نمایشی:</b> پیامک واقعی ارسال نمی‌شود. کد شما: <b dir="ltr" className="text-[17px] tracking-widest">{faDigits(demo)}</b>
        </Notice>
      )}
      {err && <p id={`${uid}-e`} role="alert" className="text-[14px] text-danger">{err}</p>}
      <Btn type="submit" busy={busy}>ورود</Btn>
      <p className="text-center text-[13px] text-rubber">
        {left > 0 ? <>ارسال دوباره تا {faNum(left)} ثانیهٔ دیگر</> :
          <button type="button" onClick={() => void send()} className="cursor-pointer font-bold text-plate hover:underline">ارسال دوبارهٔ کد</button>}
      </p>
    </form>
  )
}
