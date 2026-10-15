import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center gap-6 px-4 pt-24">
      <p className="text-7xl font-black text-plate">۴۰۴</p>
      <h1 className="text-3xl font-black">این صفحه وجود ندارد.</h1>
      <p className="lede">شاید آدرس را اشتباه وارد کرده‌اید. از صفحهٔ اصلی شروع کنید یا نزدیک‌ترین شعبه را پیدا کنید.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn-plate">صفحهٔ اصلی</Link>
        <Link to="/branches" className="btn-ghost">پیدا کردن شعبه</Link>
      </div>
    </section>
  )
}
