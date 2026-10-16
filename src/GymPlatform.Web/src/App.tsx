import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteBanner from './site/SiteBanner'
import SiteHeader from './site/SiteHeader'
import SiteFooter from './site/SiteFooter'
import Home from './pages/Home'
import PresentationBar from './panel/PresentationBar'

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
const PanelLayout = lazy(() => import('./panel/PanelLayout'))
const DashboardPage = lazy(() => import('./panel/DashboardPage'))
const ReceptionPage = lazy(() => import('./panel/ReceptionPage'))
const CoachPage = lazy(() => import('./panel/CoachPage'))
const admin = (k: 'CoachesAdmin' | 'PackagesAdmin' | 'CampaignsAdmin' | 'ContractAdmin' | 'ShopAdmin' | 'CanteenMenuAdmin' | 'StaffAdmin' | 'SmsAdmin') =>
  lazy(() => import('./panel/AdminPages').then((m) => ({ default: m[k] })))
const PackagesAdmin = admin('PackagesAdmin'), CampaignsAdmin = admin('CampaignsAdmin'), ContractAdmin = admin('ContractAdmin'), ShopAdmin = admin('ShopAdmin')
const CoachesAdmin = admin('CoachesAdmin'), CanteenMenuAdmin = admin('CanteenMenuAdmin'), StaffAdmin = admin('StaffAdmin'), SmsAdmin = admin('SmsAdmin')
const Lab = import.meta.env.DEV ? lazy(() => import('./lab/Lab')) : () => null

export default function App() {
  const { pathname, hash } = useLocation()
  const inPanel = pathname.startsWith('/panel')
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return }
    // بخش‌های صفحهٔ اصلی جدا بار می‌شوند؛ تا رسیدن بخش مقصد (حداکثر ۴ ثانیه) صبر کن
    let tries = 0, fix = 0
    const t = setInterval(() => {
      const el = document.getElementById(hash.slice(1))
      if (el || ++tries > 40) {
        clearInterval(t)
        el?.scrollIntoView({ behavior: 'smooth' })
        // بخش‌های بالاتر ممکن است بعد از رسیدن داده بلندتر شوند؛ یک بار دیگر دقیق تنظیم شود
        if (el) fix = window.setTimeout(() => {
          const off = el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop || '0')
          if (Math.abs(off) > 30) el.scrollIntoView({ behavior: 'smooth' })
        }, 1600)
      }
    }, 100)
    return () => { clearInterval(t); clearTimeout(fix) }
  }, [pathname, hash])

  return (
    <>
      <a href="#main" className="sr-only top-0 left-0 focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:left-auto focus:z-[100] rounded-full bg-primary focus:px-4 focus:py-2 text-primary-foreground">پرش به محتوا</a>
      {!inPanel && <SiteBanner />}
      <SiteHeader />
      <main id="main" style={{ paddingTop: inPanel ? 78 : 'calc(78px + var(--festival-h, 0px))' }}>
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
            <Route path="/panel" element={<PanelLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="reception" element={<ReceptionPage />} />
              <Route path="coach" element={<CoachPage />} />
              <Route path="packages" element={<PackagesAdmin />} />
              <Route path="campaigns" element={<CampaignsAdmin />} />
              <Route path="contract" element={<ContractAdmin />} />
              <Route path="shop" element={<ShopAdmin />} />
              <Route path="menu" element={<CanteenMenuAdmin />} />
              <Route path="coaches" element={<CoachesAdmin />} />
              <Route path="staff" element={<StaffAdmin />} />
              <Route path="sms" element={<SmsAdmin />} />
            </Route>
            {import.meta.env.DEV && <Route path="/lab" element={<Lab />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!inPanel && <SiteFooter />}
      <PresentationBar />
    </>
  )
}
