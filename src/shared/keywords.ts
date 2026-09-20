/**
 * רשימת המילים המובנית לסינון טקסט.
 * מכוונת לביטויים מפורשים בלבד — מילה שיש לה שימוש תמים נפוץ לא נכנסת לכאן,
 * כדי לא לחסום עמודים רפואיים, חדשותיים או לימודיים. מילים אישיות נוספות
 * מוסיפים בעמוד ההגדרות.
 */

export const HEBREW_KEYWORDS: string[] = [
  'פורנו',
  'פורנוגרפיה',
  'פורנוגרפי',
  'סרטי סקס',
  'סרטוני סקס',
  'סקס חינם',
  'סרטי מבוגרים',
  'תוכן למבוגרים',
  'עירום מלא',
  'תמונות עירום',
  'חשפנית',
  'חשפניות',
  'מין אנאלי',
  'יחסי מין מצולמים',
  'זונה',
  'זונות',
  'ליווי בתשלום',
  'נערות ליווי',
  'שירותי ליווי',
  'מצלמות סקס',
  'צאט סקס',
  'וובקאם סקס',
  'אתר למבוגרים בלבד',
]

export const ENGLISH_KEYWORDS: string[] = [
  'porn',
  'porno',
  'pornography',
  'pornhub',
  'xxx',
  'xvideos',
  'xhamster',
  'nsfw',
  'hentai',
  'milf',
  'blowjob',
  'handjob',
  'deepthroat',
  'creampie',
  'cumshot',
  'gangbang',
  'anal sex',
  'oral sex',
  'hardcore sex',
  'sex videos',
  'sex tape',
  'sex cam',
  'live sex',
  'free sex',
  'nude photos',
  'nudes',
  'nude girls',
  'naked girls',
  'topless',
  'strip club',
  'stripper',
  'camgirl',
  'escort service',
  'call girl',
  'adults only',
  'onlyfans',
  'erotic',
  'erotica',
  'fetish',
  'bdsm',
]

/** דומיינים שנחסמים תמיד, עוד לפני שהעמוד נטען לגמרי. */
export const BUILTIN_BLOCKED_DOMAINS: string[] = [
  'pornhub.com',
  'xvideos.com',
  'xhamster.com',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'spankbang.com',
  'chaturbate.com',
  'stripchat.com',
  'onlyfans.com',
  'brazzers.com',
  'nhentai.net',
  'rule34.xxx',
  'e-hentai.org',
]

const HEBREW_LETTER = '\\u05d0-\\u05ea'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isHebrew(word: string): boolean {
  return /[א-ת]/.test(word)
}

/**
 * בונה ביטוי רגולרי אחד מכל המילים.
 * בעברית מותר תחיליות (ב, ה, ו, ל, מ, ש, כ) אבל לא סיומת — כך "פורנו" נתפס גם
 * כ"הפורנו", ובאנגלית נדרש גבול מילה מלא כדי ש-"sexy" לא יתפוס את "essex".
 */
export function buildKeywordRegex(extra: string[] = []): RegExp {
  const words = [...HEBREW_KEYWORDS, ...ENGLISH_KEYWORDS, ...extra]
    .map((word) => word.trim())
    .filter(Boolean)

  const patterns = words.map((word) => {
    const escaped = escapeRegExp(word)
    return isHebrew(word)
      ? `(?<![${HEBREW_LETTER}])[\\u05d1\\u05d4\\u05d5\\u05dc\\u05de\\u05e9\\u05db]{0,2}${escaped}(?![${HEBREW_LETTER}])`
      : `\\b${escaped}\\b`
  })

  return new RegExp(patterns.join('|'), 'gi')
}

/** סופר כמה התאמות שונות יש בטקסט. מילה שחוזרת נספרת פעם אחת. */
export function countKeywordHits(text: string, regex: RegExp): number {
  regex.lastIndex = 0
  const seen = new Set<string>()
  for (const match of text.matchAll(regex)) {
    seen.add(match[0].toLowerCase())
  }
  return seen.size
}
