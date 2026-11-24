import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/vazirmatn'
import './index.css'
import App from './App'
import { loadSite } from './lib/site'

// Name, Logo, Farbe und Texte der Seite aus den Panel-Einstellungen (gespeicherte Version sofort, neue im Hintergrund)
loadSite().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  ))
