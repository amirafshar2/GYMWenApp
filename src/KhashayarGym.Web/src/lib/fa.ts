const nf = new Intl.NumberFormat('fa-IR')

/** عدد با ارقام فارسی و جداکنندهٔ هزارگان */
export const faNum = (n: number) => nf.format(n)

/** «۲٬۶۰۰٬۰۰۰ تومان» */
export const toman = (n: number) => `${nf.format(n)} تومان`

/** قیمت کوتاه برای نمایش درشت: ۲٫۶ میلیون */
export function tomanShort(n: number): { value: string; unit: string } {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return { value: new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(m), unit: 'میلیون تومان' }
  }
  return { value: nf.format(Math.round(n / 1000)), unit: 'هزار تومان' }
}

/** تاریخ شمسی */
export const jalali = (d: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', ...opts }).format(typeof d === 'string' ? new Date(d) : d)

/** تبدیل ارقام لاتین داخل یک رشته به فارسی (مثلاً شماره تلفن) */
export const faDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/** فاصله با فرمول هاورساین (کیلومتر) — فقط سمت کلاینت، موقعیت کاربر جایی ذخیره نمی‌شود */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const formatDistance = (km: number) =>
  km < 1 ? `${faNum(Math.round(km * 1000 / 50) * 50)} متر` : `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(km)} کیلومتر`
