import { ClockIcon, PhoneIcon } from 'lucide-react'
import ContactForm from '@/components/ui/contact-form'
import { api, ApiError } from '@/lib/api'
import { useData } from '@/lib/useData'
import { brand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'

const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))

/** فرم مشاورهٔ رایگان — Contact Form از 21st.dev (ثبت در API با CSRF) */
export default function SiteContact() {
  const { data: branches = [] } = useData('branches', api.branches)
  return (
    <ContactForm
      id="consult"
      eyebrow="مشاورهٔ رایگان"
      title="قبل از ثبت‌نام با ما مشورت کن"
      description="بگو هدفت چیست و کدام محله‌ای؛ همکاران ما تماس می‌گیرند و پکیج و شعبهٔ مناسب را پیشنهاد می‌دهند."
      details={
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-3"><PhoneIcon aria-hidden className="size-4 shrink-0" /><a href={`tel:${brand.phone}`} dir="ltr" className="text-foreground hover:underline">{faDigits(brand.phone)}</a></li>
          <li className="flex items-center gap-3"><ClockIcon aria-hidden className="size-4 shrink-0" /><span>معمولاً همان روز تماس می‌گیریم</span></li>
        </ul>
      }
      labels={{
        name: 'نام و نام خانوادگی',
        email: 'شمارهٔ موبایل',
        message: 'هدف یا توضیح (اختیاری)',
        submit: 'ثبت درخواست مشاوره',
        pending: 'در حال ثبت…',
        success: 'درخواست مشاوره ثبت شد. همکاران ما به‌زودی با شما تماس می‌گیرند.',
        error: 'ثبت نشد. شمارهٔ موبایل را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید و دوباره امتحان کنید.',
      }}
      fieldOptions={{
        secondField: 'tel',
        secondFieldPlaceholder: '۰۹۱۲۳۴۵۶۷۸۹',
        extraFields: (
          <label className="flex flex-col gap-2 text-sm font-medium">
            شعبهٔ موردنظر
            <select name="branchId" defaultValue="" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="" className="bg-card">فرقی نمی‌کند</option>
              {branches.map((b) => <option key={b.id} value={b.id} className="bg-card">{b.name}</option>)}
            </select>
          </label>
        ),
      }}
      onSubmit={async (v) => {
        const form = document.querySelector<HTMLFormElement>('#consult form')
        const branchId = form ? Number(new FormData(form).get('branchId')) || null : null
        try {
          await api.consult({ fullName: v.name.trim(), mobile: toLatin(v.email).replace(/\s|-/g, ''), goal: null, message: v.message.trim() || null, branchId })
        } catch (e) { throw e as ApiError }
      }}
    />
  )
}
