import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const dir = (...parts: string[]) => resolve(process.cwd(), ...parts)

// סקריפט התוכן: קובץ IIFE בודד, בלי code-splitting — כך דורש MV3.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: dir('dist/content'),
    emptyOutDir: false,
    target: 'chrome110',
    sourcemap: false,
    rollupOptions: {
      input: dir('src/content/content.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        inlineDynamicImports: true,
      },
    },
  },
})
