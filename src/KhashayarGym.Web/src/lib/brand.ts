/**
 * پیکربندی برند. برای اسکرین‌شات‌های پرتفولیو با ?brand=demo یک برند ساختگی نمایش داده می‌شود
 * تا نام، لوگو و اطلاعات تماس واقعی باشگاه در پرتفولیو نیاید.
 */
export interface Brand {
  key: 'khashayar' | 'demo'
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
}

const khashayar: Brand = {
  key: 'khashayar',
  name: 'مجموعه باشگاه‌های خشایار',
  shortName: 'خشایار',
  latinName: 'KHASHAYAR FITNESS CLUB',
  logo: '/brand/logo-mark.png',
  logoFull: '/brand/logo.png',
  slogan: 'ورزش کن؛ حتی اگه خشایار نمیای',
  nearSlogan: 'هرکجا هستی، خشایار نزدیکته',
  whySlogan: 'چرا خشایار؟',
  phone: '09193020226',
  instagram: 'https://www.instagram.com/khashayargym_shiraz/',
  city: 'شیراز',
}

const demo: Brand = {
  key: 'demo',
  name: 'باشگاه‌های آهن‌کوه',
  shortName: 'آهن‌کوه',
  latinName: 'AHANKOOH ATHLETIC',
  logo: '/brand/demo-logo.svg',
  logoFull: '/brand/demo-logo.svg',
  slogan: 'تمرین کن؛ هر روز یک وزنه سنگین‌تر',
  nearSlogan: 'هرجای شهر باشی، یک سالن نزدیکته',
  whySlogan: 'چرا آهن‌کوه؟',
  phone: '09000000000',
  city: 'شیراز',
}

function pick(): Brand {
  try {
    const q = new URLSearchParams(window.location.search).get('brand')
    if (q === 'demo') sessionStorage.setItem('brand', 'demo')
    if (q === 'khashayar') sessionStorage.removeItem('brand')
    if (sessionStorage.getItem('brand') === 'demo') return demo
  } catch { /* storage در دسترس نیست */ }
  return import.meta.env.VITE_BRAND === 'demo' ? demo : khashayar
}

export const brand: Brand = pick()

/** متن‌های دیتابیس را برای برند دمو بازنویسی می‌کند. */
export function rebrand(text: string): string {
  return brand.key === 'demo' ? text.replaceAll('خشایار', brand.shortName) : text
}
