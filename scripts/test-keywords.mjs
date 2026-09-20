// בדיקת רגרסיה לרשימות המילים: כותרות מוצר אמיתיות שצריכות להיחסם, וכותרות
// תמימות שאסור שייחסמו. הרשימות האלה נוטות לתפוס יותר מדי, ולכן כל הוספה
// צריכה לעבור כאן. הרצה: npm run test:keywords

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { transform } from 'esbuild'

const CACHE = 'node_modules/.mf-test/keywords.mjs'

const src = await readFile('src/shared/keywords.ts', 'utf8')
const { code } = await transform(src, { loader: 'ts', format: 'esm' })
await mkdir('node_modules/.mf-test', { recursive: true })
await writeFile(CACHE, code)
const { buildGarmentRegex, buildKeywordRegex, countKeywordHits } = await import(
  `${pathToFileURL(CACHE).href}?v=${Date.now()}`
)

/** כותרות שהמסנן לפי הקשר חייב לתפוס. */
const GARMENT_BLOCK = [
  'סרונגים לנשים כיסוי חוף ארוך בגד ים כיסוי פ...',
  'בגדי ים ביקיני לנשים',
  'חזיות ספורט לנשים',
  'שמלת מיני עם גב חשוף',
  'הלבשה תחתונה תחרה',
  'Sexy Women Bikini Set Swimwear Beach',
  'Lace Lingerie Set Bras and Panties',
  'women swimsuits one piece',
]

/** כותרות תמימות מאותם עמודי חנות — אסור שייחסמו. */
const GARMENT_PASS = [
  'סינר חצי עם הדפס פרחוני, סגנון יפני',
  'INGNI TAKAKO סינר מודפס יפהפה',
  'סינר אומנות ציפורניים מתכוונן',
  '1 חותך ספירלי, חותך גזר, צנון, תפוח אדמה',
  'סט של 60 סיכות ביטחון בגדלים שונים',
  'סינר תחרה גיקארד לבן בצבע חלק אחיד',
  'כל מיני דברים שימושיים למטבח',
  'Stainless Steel Kitchen Apron for Women',
  'Bracelet with silver charms',
]

/** עמודים שסינון הטקסט צריך לחסום (ארבעה ביטויים שונים ומעלה). */
const PAGE_BLOCK = ['אתר פורנו עם סרטי סקס חינם ותמונות עירום וחשפניות']

/** עמודים תמימים שנוגעים בנושא — אסור שייחסמו. */
const PAGE_PASS = [
  'הרצאה על חינוך לצניעות ועל הסכנות שבחשיפה לתוכן פוגעני ברשת',
  'מאמר רפואי על בריאות המין והפוריות אצל נשים',
]

let failures = 0

function expect(ok, line) {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${line}`)
}

for (const text of GARMENT_BLOCK) {
  const hit = buildGarmentRegex().exec(text)?.[0] ?? null
  expect(hit !== null, `חסימה לפי הקשר | ${hit ? `נתפס "${hit}"` : 'לא נתפס'} | ${text}`)
}
console.log('')
for (const text of GARMENT_PASS) {
  const hit = buildGarmentRegex().exec(text)?.[0] ?? null
  expect(hit === null, `מעבר חופשי | ${hit ? `נתפס בטעות "${hit}"` : 'נקי'} | ${text}`)
}
console.log('')
for (const text of PAGE_BLOCK) {
  const hits = countKeywordHits(text, buildKeywordRegex())
  expect(hits >= 4, `חסימת עמוד | ${hits} ביטויים | ${text}`)
}
for (const text of PAGE_PASS) {
  const hits = countKeywordHits(text, buildKeywordRegex())
  expect(hits < 4, `עמוד תמים | ${hits} ביטויים | ${text}`)
}

console.log(`\n${failures === 0 ? 'כל הבדיקות עברו' : `${failures} כשלונות`}`)
process.exit(failures === 0 ? 0 : 1)
