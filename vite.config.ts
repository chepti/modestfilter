import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// כל הנתיבים נגזרים מ-process.cwd() ולא מ-__dirname, כדי שלא ייווצר ערבוב
// בין אות כונן ממופה לנתיב המקורי — ערבוב כזה שובר את מנגנון ה-html-proxy.
const dir = (...parts: string[]) => resolve(process.cwd(), ...parts)

// בנייה ראשית: service worker, מסמך ה-offscreen, פופאפ והגדרות.
// סקריפט התוכן נבנה בנפרד (vite.content.config.ts) כי MV3 דורש IIFE בקובץ אחד.
export default defineConfig({
  root: dir('src'),
  publicDir: dir('public'),
  build: {
    outDir: dir('dist'),
    emptyOutDir: true,
    target: 'chrome110',
    sourcemap: false,
    rollupOptions: {
      input: {
        'background/service-worker': dir('src/background/service-worker.ts'),
        offscreen: dir('src/offscreen/offscreen.html'),
        popup: dir('src/popup/popup.html'),
        options: dir('src/options/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
