import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload window when a new production deployment renders old dynamic chunk assets invalid
window.addEventListener('vite:preloadError', (_event) => {
  console.warn('New deployment detected or asset preloading failed. Reloading page...');
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

