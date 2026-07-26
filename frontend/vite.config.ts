import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Serve PWA manifest and static icons directly from public/ (dev server fix)
function serveStaticAssets(): import('vite').Plugin {
  return {
    name: 'serve-static-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const port = server.config.server.port || 3000
        const url = new URL(req.url || '', `http://localhost:${port}`)
        const pathname = url.pathname

        // Serve manifest.json, icons, and other static assets from public/
        // NOTE: pathname === '/' was intentionally removed from this condition.
        // That check intercepted the root path and tried to serve
        // public/index.html which doesn't exist, causing a blank white screen.
        // Vite's dev server handles index.html from project root natively.
        if (pathname.startsWith('/manifest') ||
            pathname.startsWith('/favicon') ||
            pathname.startsWith('/apple-touch') ||
            pathname.startsWith('/og-image') ||
            pathname.startsWith('/browserconfig')) {
          const filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname)
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath)
            const mimeTypes: Record<string, string> = {
              '.json': 'application/json',
              '.png': 'image/png',
              '.svg': 'image/svg+xml',
              '.xml': 'application/xml',
            }
            const contentType = mimeTypes[ext] || 'application/octet-stream'
            res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'no-cache')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        next()
      })
    },
  }
}

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://neural-justice.catalystapps.in https://dev-neural-justice.catalystapps.in https://staging-neural-justice.catalystapps.in https://*.catalystserverless.in https://nominatim.openstreetmap.org https://api.maptiler.com https://tiles.openfreemap.org https://tile.openstreetmap.org",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

export default defineConfig({
  base: '/app/',
  plugins: [react(), serveStaticAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        // Local FastAPI backend (backend/api/main.py, served on 127.0.0.1:8000).
        // The dead Catalyst domain was previously hardcoded here and never
        // resolved, which is what surfaced the "Data Sync Paused / Internal
        // Server Error" banner on the dashboard. In a Catalyst deployment the
        // platform's own gateway fronts /api, so this local target is only used
        // for development.
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
    },
    headers: {
      'Content-Security-Policy': cspHeader,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    cssMinify: 'esbuild',
    minify: 'esbuild',
    rollupOptions: {
output: {
          inlineDynamicImports: true,
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: true,
  },
})
