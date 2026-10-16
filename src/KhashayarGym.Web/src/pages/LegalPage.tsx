import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { brand } from '@/lib/brand'
import { faDigits } from '@/lib/fa'
import { cn } from '@/lib/utils'

/**
 * صفحه‌هایی که اینماد و درگاه پرداخت لازم دارند. متن‌ها پیش‌نویس است:
 * بخش‌های زرد را باشگاه پر می‌کند و متن نهایی را مشاور حقوقی تأیید می‌کند.
 */
const Fill = ({ children }: { children: ReactNode }) => (
  <mark className="rounded bg-sun/30 px-1 text-chalk" title="باید توسط باشگاه تکمیل شود">{children}</mark>
)

type Doc = { title: string; updated: string; body: ReactNode }

const DOCS: Record<string, Doc> = {
  about: {
    title: 'درباره ما',
    updated: '۱۴۰۵/۰۷/۲۴',
    body: <>
      <p>{brand.name} با <Fill>۱۲</Fill> شعبه در {brand.city}، سالن‌های جدای آقایان و بانوان و رشته‌های بدنسازی، کراس‌فیت، فانکشنال، TRX، ایروبیک، پیلاتس، یوگا و صخره‌نوردی را زیر نظر مربیان دارای مدرک فدراسیون ارائه می‌دهد.</p>
      <h2>اطلاعات کسب‌وکار</h2>
      <ul>
        <li>نام صاحب امتیاز / شرکت: <Fill>نام کامل یا نام شرکت</Fill></li>
        <li>شمارهٔ مجوز فعالیت: <Fill>شمارهٔ پروانه / مجوز اداره ورزش و جوانان</Fill></li>
        <li>نشانی دفتر مرکزی: <Fill>نشانی کامل + کد پستی</Fill></li>
        <li>تلفن ثابت: <Fill>۰۷۱-…</Fill> · موبایل پشتیبانی: <span dir="ltr">{faDigits(brand.phone)}</span></li>
        <li>ساعات پاسخگویی: <Fill>شنبه تا پنجشنبه ۹ تا ۲۱</Fill></li>
        <li>ایمیل: <Fill>info@دامنه</Fill></li>
      </ul>
      <p>نشانی و ساعت کاری همهٔ شعبه‌ها در <Link to="/branches">صفحهٔ شعبه‌ها</Link> آمده است.</p>
    </>,
  },
  terms: {
    title: 'قوانین و مقررات',
    updated: '۱۴۰۵/۰۷/۲۴',
    body: <>
      <p>استفاده از این سایت و خرید عضویت به معنی پذیرش این قوانین است. متن کامل تعهدات طرفین در «قرارداد عضویت» است که پیش از پرداخت خوانده و با کد پیامکی امضا می‌شود؛ نسخهٔ PDF آن در پروفایل هر عضو می‌ماند.</p>
      <h2>حساب کاربری</h2>
      <ul>
        <li>ورود فقط با شمارهٔ موبایل خود شخص و کد پیامکی انجام می‌شود. کد را در اختیار کسی نگذارید.</li>
        <li>نام ثبت‌شده باید مطابق کارت ملی باشد؛ عضویت شخصی و غیرقابل انتقال است.</li>
      </ul>
      <h2>عضویت و قیمت‌ها</h2>
      <ul>
        <li>همهٔ قیمت‌ها به تومان و شامل <Fill>مالیات بر ارزش افزوده / بدون مالیات</Fill> است. تخفیف جشنواره و کد تخفیف فقط در بازهٔ اعلام‌شده معتبر است و با هم <Fill>جمع می‌شوند / جمع نمی‌شوند</Fill>.</li>
        <li>اعتبار عضویت از لحظهٔ پرداخت موفق شروع می‌شود؛ در تمدید، از پایان عضویت فعلی ادامه پیدا می‌کند.</li>
        <li>عضویت فقط در شعبه و سالن انتخاب‌شده معتبر است، مگر خلاف آن اعلام شود.</li>
        <li>در پکیج‌های جلسه‌ای، اولین ورود هر روز یک جلسه محسوب می‌شود.</li>
      </ul>
      <h2>رفتار در باشگاه</h2>
      <ul>
        <li>رعایت مقررات سالن، پوشش مناسب، نوبت دستگاه‌ها و بهداشت فردی الزامی است.</li>
        <li>باشگاه مسئول وسایل شخصی خارج از کمدهای قفل‌دار نیست.</li>
        <li>پاسخ‌های فرم سلامت مسئولیت عضو است؛ در صورت بیماری، تمرین پس از مشورت با پزشک انجام شود.</li>
      </ul>
      <h2>رسیدگی به شکایات</h2>
      <p>شکایت‌ها از طریق تلفن <span dir="ltr">{faDigits(brand.phone)}</span> یا <Link to="/#consult">فرم تماس</Link> ثبت و حداکثر ظرف <Fill>۴۸ ساعت کاری</Fill> پاسخ داده می‌شود.</p>
    </>,
  },
  privacy: {
    title: 'حریم خصوصی',
    updated: '۱۴۰۵/۰۷/۲۴',
    body: <>
      <h2>چه اطلاعاتی نگه می‌داریم</h2>
      <ul>
        <li>شمارهٔ موبایل، نام و جنسیت (برای حساب، فاکتور و تخصیص سالن).</li>
        <li>پاسخ‌های فرم سلامت و متن قرارداد امضاشده همراه با زمان، IP و مرورگر امضا (به‌عنوان سند قرارداد).</li>
        <li>سوابق پرداخت (مبلغ، شمارهٔ پیگیری و کد تراکنش). اطلاعات کارت بانکی هرگز به سایت نمی‌رسد و فقط در صفحهٔ بانک وارد می‌شود.</li>
        <li>زمان ورود به باشگاه (برای حضور و غیاب و شمارش جلسات).</li>
      </ul>
      <h2>موقعیت مکانی</h2>
      <p>دکمهٔ «نزدیک‌ترین شعبه» موقعیت شما را فقط در مرورگر خودتان استفاده می‌کند و به سرور ارسال یا ذخیره نمی‌شود.</p>
      <h2>استفاده و نگهداری</h2>
      <ul>
        <li>اطلاعات فقط برای ارائهٔ خدمات باشگاه، پیامک‌های مربوط به عضویت (کد ورود، یادآوری تمدید) و الزامات قانونی استفاده می‌شود و به هیچ شخص ثالثی فروخته نمی‌شود.</li>
        <li>دسترسی کارکنان به اطلاعات بر اساس نقش محدود است (مثلاً مربی فقط شاگردان خودش را می‌بیند).</li>
        <li>پیامک تبلیغاتی فقط با رضایت شما ارسال می‌شود و با <Fill>ارسال «لغو» / عدد ۱۱</Fill> قطع می‌شود.</li>
        <li>برای حذف حساب یا اصلاح اطلاعات با پشتیبانی تماس بگیرید. سوابق مالی و قرارداد طبق قانون تا <Fill>مدت قانونی</Fill> نگه داشته می‌شود.</li>
      </ul>
    </>,
  },
  refund: {
    title: 'شرایط لغو عضویت و بازگشت وجه',
    updated: '۱۴۰۵/۰۷/۲۴',
    body: <>
      <ul>
        <li>تا <Fill>۷۲ ساعت</Fill> پس از پرداخت و پیش از اولین ورود به باشگاه: بازگشت کامل مبلغ <Fill>با کسر … درصد</Fill>.</li>
        <li>پس از اولین ورود: <Fill>مبلغ قابل بازگشت نیست / به نسبت روزهای باقی‌مانده با کسر … درصد برمی‌گردد</Fill>.</li>
        <li>تعلیق (فریز) عضویت: حداکثر <Fill>… روز</Fill> در طول دورهٔ عضویت، با درخواست به پذیرش.</li>
        <li>بازگشت وجه حداکثر ظرف <Fill>۷ روز کاری</Fill> به همان کارتی که پرداخت با آن انجام شده واریز می‌شود.</li>
        <li>اگر پرداخت ناموفق بود ولی مبلغ از حساب کم شد، بانک طبق قوانین شاپرک حداکثر تا ۷۲ ساعت آن را برمی‌گرداند.</li>
        <li>محصولات فروشگاه: <Fill>تا … روز در صورت باز نشدن بسته‌بندی قابل مرجوع است</Fill>. مکمل‌های باز شده مرجوع نمی‌شوند.</li>
      </ul>
      <p>برای درخواست لغو با <span dir="ltr">{faDigits(brand.phone)}</span> تماس بگیرید یا به پذیرش شعبه مراجعه کنید.</p>
    </>,
  },
}

export const LEGAL_LINKS = [
  { to: '/about', text: 'درباره ما' },
  { to: '/terms', text: 'قوانین و مقررات' },
  { to: '/privacy', text: 'حریم خصوصی' },
  { to: '/refund', text: 'لغو و بازگشت وجه' },
]

export default function LegalPage() {
  const key = useLocation().pathname.slice(1)
  const doc = DOCS[key] ?? DOCS.terms
  useEffect(() => { document.title = `${doc.title} | ${brand.name}` }, [doc.title])
  return (
    <div className="bg-steel">
      <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="صفحه‌های قوانین" className="lg:sticky lg:top-[100px] lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:grid">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} aria-current={l.to === `/${key}` ? 'page' : undefined}
                  className={cn('block rounded-[3px] px-4 py-2.5 text-[14px] font-bold transition-colors',
                    l.to === `/${key}` ? 'bg-chalk text-white' : 'bg-white text-chalk hover:text-plate')}>{l.text}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="rounded-[6px] border border-steel-2 bg-white p-6 sm:p-10 [&_a]:font-bold [&_a]:text-plate [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-[19px] [&_h2]:font-black [&_h2]:text-chalk [&_li]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ps-5 text-[15px] leading-8 text-chalk/90">
          <h1 className="mb-1 text-[28px] font-black text-chalk sm:text-[34px]">{doc.title}</h1>
          <p className="mb-8 text-[13px] text-rubber">آخرین به‌روزرسانی: {doc.updated}</p>
          {doc.body}
        </article>
      </div>
    </div>
  )
}
