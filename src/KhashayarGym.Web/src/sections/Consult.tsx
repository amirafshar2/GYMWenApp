import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useData } from '../lib/useData'
import { brand } from '../lib/brand'
import { faDigits } from '../lib/fa'

const GOALS = ['کاهش وزن', 'افزایش حجم', 'تناسب اندام', 'قدرت', 'صخره‌نوردی', 'سایر']
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))

/** فرم مشاورهٔ رایگان (با CSRF و rate limit سمت سرور) */
export default function Consult() {
  const { data: branches = [] } = useData('branches', api.branches)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [message, setMessage] = useState('')

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = {
      fullName: String(fd.get('fullName') ?? '').trim(),
      mobile: toLatin(String(fd.get('mobile') ?? '')).replace(/\s|-/g, ''),
      goal: (fd.get('goal') as string) || null,
      message: (fd.get('message') as string)?.trim() || null,
      branchId: fd.get('branchId') ? Number(fd.get('branchId')) : null,
    }
    const local: Record<string, string> = {}
    if (body.fullName.length < 3) local.fullName = 'نام و نام خانوادگی را وارد کنید.'
    if (!/^(\+98|0098|0)?9\d{9}$/.test(body.mobile)) local.mobile = 'شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.'
    setErrors(local)
    if (Object.keys(local).length) return

    setState('sending')
    try {
      const res = await api.consult(body)
      setMessage(res.message)
      setState('done')
    } catch (err) {
      const ae = err as ApiError
      const map: Record<string, string> = {}
      for (const [k, v] of Object.entries(ae.errors ?? {})) map[k.charAt(0).toLowerCase() + k.slice(1)] = v[0]
      setErrors({ ...map, form: ae.message })
      setState('idle')
    }
  }

  const field = 'mt-2 w-full rounded-xl border border-steel-2 bg-iron px-4 py-3 text-chalk placeholder:text-rubber/60 focus:border-plate-hi focus:outline-none'

  return (
    <section id="consult" aria-labelledby="consult-title" className="relative overflow-hidden border-t border-steel-2">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-2">
        <div>
          <h2 id="consult-title" className="section-title">مشاورهٔ رایگان قبل از ثبت‌نام</h2>
          <p className="lede mt-5">بگو هدفت چیست و کدام محله‌ای. همکاران ما تماس می‌گیرند و پکیج و شعبهٔ مناسب را پیشنهاد می‌دهند.</p>
          <p className="mt-8 text-rubber">
            یا همین حالا تماس بگیر: <a href={`tel:${brand.phone}`} className="font-bold text-chalk hover:text-plate-hi" dir="ltr">{faDigits(brand.phone)}</a>
          </p>
        </div>

        {state === 'done' ? (
          <div role="status" className="self-center rounded-3xl border border-plate bg-plate/10 p-8">
            <p className="text-2xl font-black">ثبت شد.</p>
            <p className="mt-3 leading-8 text-chalk/85">{message}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-3xl border border-steel-2 bg-steel p-6 md:p-8">
            <label className="block">
              <span className="text-sm font-bold">نام و نام خانوادگی</span>
              <input name="fullName" autoComplete="name" maxLength={100} className={field} aria-invalid={!!errors.fullName} aria-describedby="e-name" />
              {errors.fullName && <span id="e-name" className="mt-1.5 block text-sm text-amber-300">{errors.fullName}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-bold">شمارهٔ موبایل</span>
              <input name="mobile" inputMode="numeric" autoComplete="tel" maxLength={14} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" className={`${field} text-right`} aria-invalid={!!errors.mobile} aria-describedby="e-mobile" />
              {errors.mobile && <span id="e-mobile" className="mt-1.5 block text-sm text-amber-300">{errors.mobile}</span>}
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold">هدف</span>
                <select name="goal" className={field} defaultValue="">
                  <option value="">انتخاب کنید</option>
                  {GOALS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold">شعبهٔ موردنظر</span>
                <select name="branchId" className={field} defaultValue="">
                  <option value="">فرقی نمی‌کند</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-bold">توضیح (اختیاری)</span>
              <textarea name="message" rows={3} maxLength={1000} className={field} />
            </label>
            {errors.form && <p role="alert" className="text-sm text-amber-300">{errors.form}</p>}
            <button type="submit" disabled={state === 'sending'} className="btn-plate disabled:opacity-70">
              {state === 'sending' ? 'در حال ثبت…' : 'ثبت درخواست مشاوره'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
