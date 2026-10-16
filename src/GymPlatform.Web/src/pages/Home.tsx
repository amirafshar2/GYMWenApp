import { lazy, Suspense } from 'react'
import SiteHero from '../site/SiteHero'

const HomeRest = lazy(() => import('./HomeRest'))

/** ترتیب بخش‌ها از روی صفحهٔ مرجع (GYM Store / Sports Complex) + بخش‌های لازمِ پروژه */
export default function Home() {
  return (
    <>
      <SiteHero />
      <Suspense fallback={<div className="min-h-screen" aria-hidden />}>
        <HomeRest />
      </Suspense>
    </>
  )
}
