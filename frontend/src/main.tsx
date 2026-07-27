import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './i18n';
import './index.css';

// Global fetch override: in production (Catalyst deployment), prefix all /api/...
// calls with the server endpoint and inject X-Demo-Session to bypass the Catalyst
// OAuth gateway. The header is set DIRECTLY on init.headers as a plain object
// (NOT via new Headers()) to avoid browser compatibility issues.
const API_BASE = import.meta.env.VITE_API_URL;
if (API_BASE) {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && (input.startsWith('/api/') || input === '/api')) {
      // Merge headers into init as a plain Record<string,string>
      const headers: Record<string, string> = {};
      // Copy existing headers (plain object or Headers)
      if (init?.headers) {
        const h = init.headers;
        if (h instanceof Headers) {
          h.forEach((v, k) => { headers[k] = v; });
        } else if (Array.isArray(h)) {
          h.forEach(([k, v]) => { headers[k] = v; });
        } else {
          Object.assign(headers, h as Record<string, string>);
        }
      }
      // Override auth — Catalyst blocks real Authorization headers
      if (headers['Authorization'] || headers['authorization']) {
        delete headers['Authorization'];
        delete headers['authorization'];
      }
      if (!headers['X-Demo-Session'] && !headers['x-demo-session']) {
        headers['X-Demo-Session'] = 'true';
      }
      return origFetch(`${API_BASE}${input}`, { ...init, headers });
    }
    return origFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
