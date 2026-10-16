import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteBanner from './site/SiteBanner'
import SiteHeader from './site/SiteHeader'
import SiteFooter from './site/SiteFooter'
import Home from './pages/Home'

const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const PackagesPage = lazy(() => import('./pages/PackagesPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const JoinResultPage = lazy(() => import('./pages/JoinResultPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const ShopPage = lazy(() => import('./pages/shop/ShopPage'))
const ProductPage = lazy(() => import('./pages/shop/ProductPage'))
const CartPage = lazy(() => import('./pages/shop/CartPage'))
const ShopOrderPage = lazy(() => import('./pages/shop/ShopOrderPage'))
const WalletPage = lazy(() => import('./pages/WalletPage'))
const FestivalPage = lazy(() => import('./pages/FestivalPage'))
const CanteenMenuPage = lazy(() => import('./pages/canteen/CanteenMenuPage'))
const CanteenOrderPage = lazy(() => import('./pages/canteen/CanteenOrderPage'))
const CanteenBoardPage = lazy(() => import('./pages/canteen/CanteenBoardPage'))
const CanteenQrPage = lazy(() => import('./pages/canteen/CanteenQrPage'))
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
      <SiteHeader />
      <main id="main" style={{ paddingTop: 'calc(78px + var(--festival-h, 0px))' }}>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/result" element={<JoinResultPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {['/about', '/terms', '/privacy', '/refund'].map((p) => <Route key={p} path={p} element={<LegalPage />} />)}
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/orders/:id" element={<ShopOrderPage />} />
            <Route path="/shop/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/festival" element={<FestivalPage />} />
            <Route path="/canteen/orders/:id" element={<CanteenOrderPage />} />
            <Route path="/canteen/:branch" element={<CanteenMenuPage />} />
            <Route path="/panel/canteen" element={<CanteenBoardPage />} />
            <Route path="/panel/canteen/qr" element={<CanteenQrPage />} />
            {import.meta.env.DEV && <Route path="/lab" element={<Lab />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
