import { createRoot, Root } from 'react-dom/client';
import App from './App.tsx';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import './index.css';

let root: Root | null = null;

function renderApp() {
  const container = document.getElementById('root');
  if (!container) return;
  if (!root) {
    root = createRoot(container);
  }
  if (!container.hasChildNodes()) {
    root.render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <App />
        <Toaster />
      </ThemeProvider>
    );
  }
}

renderApp();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    renderApp();
  }
});
