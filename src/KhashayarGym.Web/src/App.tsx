import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteBanner from './site/SiteBanner'
import SiteNav from './site/SiteNav'
import SiteFooter from './site/SiteFooter'
import Home from './pages/Home'

const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const PackagesPage = lazy(() => import('./pages/PackagesPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Lab = import.meta.env.DEV ? lazy(() => import('./lab/Lab')) : () => null

export default function App() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] rounded-full bg-primary px-4 py-2 text-primary-foreground">پرش به محتوا</a>
      <SiteBanner />
      <SiteNav />
      <main id="main">
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            {import.meta.env.DEV && <Route path="/lab" element={<Lab />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
