import { lazy, Suspense } from 'react'
import SiteHero from '../site/SiteHero'

const HomeRest = lazy(() => import('./HomeRest'))

/** Reihenfolge der Bereiche nach der Referenzseite (GYM Store / Sports Complex) + nötige Projektbereiche */
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
