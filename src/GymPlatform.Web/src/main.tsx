import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/vazirmatn'
import './index.css'
import App from './App'
import { loadSite } from './lib/site'

// نام، لوگو، رنگ و متن‌های سایت از تنظیمات پنل (نسخهٔ ذخیره‌شده فوراً، نسخهٔ تازه در پس‌زمینه)
loadSite().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  ))
