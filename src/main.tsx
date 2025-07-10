import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Toaster } from '@/components/ui/toaster'
import './index.css'

// GitHub OAuth callbacks add ?code= and ?state= parameters which can break
// relative asset paths when the page reloads. Clean up the URL so the app
// loads correctly after authentication.
if (window.location.search.includes('code=')) {
  window.history.replaceState({}, '', window.location.pathname)
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
