/**
 * نام، لوگو و تماس باشگاه. مقدارها از «تنظیمات سایت» در پنل می‌آیند (lib/site.ts قبل از اولین نمایش پرشان می‌کند)؛
 * در کد هیچ نام تجاری‌ای نیست.
 */
export interface Brand {
  name: string
  shortName: string
  latinName: string
  logo: string
  /** لوگوی کامل (با نوشته) برای فوتر */
  logoFull: string
  slogan: string
  nearSlogan: string
  whySlogan: string
  phone: string
  instagram?: string
  city: string
  /** کد نماد اعتماد الکترونیکی (از enamad.ir) */
  enamad?: { id: string; code: string }
}

export const brand: Brand = {
  name: 'باشگاه',
  shortName: 'باشگاه',
  latinName: '',
  logo: '/brand/placeholder-logo.svg',
  logoFull: '/brand/placeholder-logo.svg',
  slogan: '',
  nearSlogan: '',
  whySlogan: '',
  phone: '',
  city: '',
}
