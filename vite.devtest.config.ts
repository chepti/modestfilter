import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const dir = (...parts: string[]) => resolve(process.cwd(), ...parts)

// שרת פיתוח לבדיקת מנוע הסיווג מחוץ לתוסף: טוען את אותו מודל ואת אותה ספרייה,
// ומסווג שתי תמונות דוגמה. לא חלק מהתוסף עצמו.
export default defineConfig({
  root: dir('src/devtest'),
  publicDir: dir('public'),
  server: { port: 5177, strictPort: true },
})
