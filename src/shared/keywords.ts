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

/**
 * ביטויים שמתארים פריט לבוש לא צנוע. אלה אינם מילים פוגעניות ולכן אינם חוסמים
 * עמוד שלם — הם משמשים לחסימת תמונה בודדת לפי הטקסט שלידה (כותרת מוצר, alt,
 * כתובת הקישור). בחנות אונליין זה מדויק בהרבה ממודל הראייה, ופועל מיד בלי
 * להמתין לסיווג.
 *
 * "מיני" לבדה לא נכללת בכוונה — היא מופיעה בעברית בהקשרים תמימים ("כל מיני").
 * מאותה סיבה מועדפים צירופים על פני מילים בודדות.
 */
export const GARMENT_KEYWORDS: string[] = [
  // ים וחוף
  'בגד ים',
  'בגדי ים',
  'ביקיני',
  'בקיני',
  'מונוקיני',
  'טנקיני',
  'חליפת ים',
  'כיסוי חוף',
  'בגדי חוף',
  'סרונג',
  // הלבשה תחתונה
  'הלבשה תחתונה',
  'לבני נשים',
  'תחתונים',
  'חזייה',
  'חזיות',
  'בראלט',
  'בייבידול',
  'לינגרי',
  "לינג'רי",
  'מחוך',
  'בגד גוף',
  'גרבי רשת',
  'ביריות',
  // גזרות חושפניות
  'חצאית מיני',
  'שמלת מיני',
  'שמלה שקופה',
  'גב חשוף',
  'כתפיים חשופות',
  'מחשוף עמוק',
  'טופ קצר',
  'בטן חשופה',
  'שקוף למחצה',

  'swimsuit',
  'swimwear',
  'bikini',
  'monokini',
  'tankini',
  'beachwear',
  'beach cover',
  'cover-up',
  'sarong',
  'lingerie',
  'underwear',
  'panties',
  'thong',
  'bra',
  'bralette',
  'babydoll',
  'corset',
  'bodysuit',
  'garter',
  'fishnet',
  'nightgown',
  'negligee',
  'cleavage',
  'mini skirt',
  'miniskirt',
  'crop top',
  'see-through',
  'sheer dress',
  'backless',
  'strapless',
  'off-shoulder',
  'low cut',
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
function compile(words: string[], allowSuffix: boolean): RegExp {
  const patterns = words
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => {
      const escaped = escapeRegExp(word)
      if (!isHebrew(word)) return `\\b${escaped}${allowSuffix ? 's?\\b' : '\\b'}`
      const prefix = `(?<![${HEBREW_LETTER}])[\\u05d1\\u05d4\\u05d5\\u05dc\\u05de\\u05e9\\u05db]{0,2}`
      return allowSuffix ? `${prefix}${escaped}` : `${prefix}${escaped}(?![${HEBREW_LETTER}])`
    })
  return new RegExp(patterns.join('|'), 'gi')
}

export function buildKeywordRegex(extra: string[] = []): RegExp {
  return compile([...HEBREW_KEYWORDS, ...ENGLISH_KEYWORDS, ...extra], false)
}

/**
 * ביטוי לזיהוי פריטי לבוש בטקסט שליד תמונה.
 * כאן מותרות סיומות — "ביקיני" צריך לתפוס גם "ביקיניים", ו-"swimsuit" את
 * "swimsuits" — כי מדובר בשמות מוצר ולא במילים פוגעניות שצריך לזהות במדויק.
 */
export function buildGarmentRegex(extra: string[] = []): RegExp {
  return compile([...GARMENT_KEYWORDS, ...extra], true)
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
