const DISCIPLINES = [
  { name: 'بدنسازی', note: 'حجم، قدرت و فرم بدن با برنامهٔ شخصی' },
  { name: 'کراس‌فیت', note: 'تمرین‌های شدید و متنوع گروهی' },
  { name: 'فیتنس فانکشنال', note: 'حرکت‌هایی که در زندگی روزمره به کار می‌آیند' },
  { name: 'TRX', note: 'تمرین با وزن بدن و تسمه‌های معلق' },
  { name: 'ایروبیک', note: 'استقامت قلبی و چربی‌سوزی با ریتم' },
  { name: 'پیلاتس', note: 'قدرت مرکز بدن و فرم صحیح' },
  { name: 'یوگا', note: 'انعطاف، تنفس و تمرکز' },
  { name: 'CX WORX', note: 'سی دقیقه تمرین فشرده برای میان‌تنه' },
  { name: 'صخره‌نوردی', note: 'دیوار سالنی، بولدرینگ و طناب' },
]

/** رشته‌ها: فهرست تایپوگرافیک درشت؛ هر ردیف با hover/focus توضیحش را نشان می‌دهد */
export default function Disciplines() {
  return (
    <section id="disciplines" aria-labelledby="disc-title" className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
      <h2 id="disc-title" className="section-title">{DISCIPLINES.length.toLocaleString('fa-IR')} رشته، یک عضویت</h2>
      <p className="lede mt-4">هر شعبه بخشی از این رشته‌ها را دارد؛ روی کارت هر شعبه در نقشه می‌بینید کدام.</p>
      <ul className="mt-12 border-t border-steel-2">
        {DISCIPLINES.map((d) => (
          <li key={d.name} tabIndex={0} className="group grid items-baseline gap-2 border-b border-steel-2 py-5 outline-none md:grid-cols-[1fr_auto] md:py-6">
            <span
              className="font-black leading-none text-chalk/55 transition-colors [@media(hover:none)]:text-chalk duration-300 group-hover:text-chalk group-focus:text-chalk"
              style={{ fontSize: 'clamp(2rem, 6vw, 5rem)' }}
            >{d.name}</span>
            <span className="text-rubber transition-colors duration-300 group-hover:text-plate-hi group-focus:text-plate-hi md:text-left">{d.note}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
