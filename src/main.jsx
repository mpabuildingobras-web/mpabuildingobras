import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './telas.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// App instalável: o service worker só entra no site publicado. No `npm run dev` ele
// atrapalharia, guardando cópia de código que muda a cada segundo.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
