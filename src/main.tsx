import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme, getSavedTheme } from './lib/theme'
import './index.css'
import App from './App.tsx'

applyTheme(getSavedTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
