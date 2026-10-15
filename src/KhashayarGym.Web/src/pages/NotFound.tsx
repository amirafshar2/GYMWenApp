import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center gap-6 px-4 pt-24">
      <p className="text-7xl font-black text-primary">۴۰۴</p>
      <h1 className="text-3xl font-bold">این صفحه وجود ندارد.</h1>
      <p className="text-lg text-muted-foreground">شاید آدرس را اشتباه وارد کرده‌اید. از صفحهٔ اصلی شروع کنید یا نزدیک‌ترین شعبه را پیدا کنید.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full"><Link to="/">صفحهٔ اصلی</Link></Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/branches">پیدا کردن شعبه</Link></Button>
      </div>
    </section>
  )
}
