import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { startSmoothScroll, scrollToId } from './lib/motion'
import Header from './components/Header'
import FestivalBar from './components/FestivalBar'
import Footer from './components/Footer'
import Home from './pages/Home'

const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const PackagesPage = lazy(() => import('./pages/PackagesPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  const { pathname, hash } = useLocation()

  useEffect(() => { startSmoothScroll() }, [])
  useEffect(() => {
    if (hash) setTimeout(() => scrollToId(hash.slice(1)), 50)
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] btn-plate">پرش به محتوا</a>
      <FestivalBar />
      <Header />
      <main id="main">
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
