export type NsfwClassName = 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy'

export interface Prediction {
  className: NsfwClassName
  probability: number
}

/** התוצאה לכל תמונה: בטוחה, חסומה, או שלא הצלחנו לבדוק. */
export type Verdict = 'safe' | 'blocked' | 'error'

export interface ClassifyResult {
  verdict: Verdict
  /** הציון המשוקלל 0–1 שהוביל להחלטה. */
  score: number
  predictions?: Prediction[]
  reason?: string
}

export interface Settings {
  enabled: boolean
  /** סף חסימה על הציון המשוקלל (0–1). נמוך יותר = מחמיר יותר. */
  threshold: number
  /** משקל הקטגוריה Sexy בציון. Porn ו-Hentai תמיד במשקל מלא. */
  sexyWeight: number
  /** משקל הקטגוריה Drawing — איורים גסים; ברירת מחדל 0 (לא נחשב). */
  drawingWeight: number
  /** תמונות קטנות מזה (רוחב או גובה בפיקסלים) לא נבדקות — אייקונים, לוגואים. */
  minImageSize: number
  /** לטפל בכל תמונה עד שהבדיקה הסתיימה, כדי למנוע הבזק של תוכן לא מסונן. */
  hideUntilChecked: boolean
  /** איך נראית תמונה שטרם נבדקה: טשטוש חזק, או הסתרה מלאה. */
  pendingStyle: 'blur' | 'hidden'
  /** אם לא ניתן היה לבדוק תמונה — לחסום אותה בכל זאת. */
  blockOnError: boolean
  textFilterEnabled: boolean
  /** כמה התאמות בטקסט העמוד נדרשות כדי לחסום אותו. */
  textHitsToBlock: number
  /** מילים נוספות מעבר לרשימה המובנית, מופרדות בשורות. */
  extraKeywords: string[]
  /** דומיינים שנחסמים מיד, בלי בדיקה. */
  blockedDomains: string[]
  /** דומיינים שבהם התוסף כבוי לגמרי. */
  allowedDomains: string[]
  /** מצב אבחון: רישום כל תוצאת סיווג לקונסול של העמוד. */
  debug: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  threshold: 0.45,
  sexyWeight: 0.6,
  drawingWeight: 0,
  minImageSize: 48,
  hideUntilChecked: true,
  pendingStyle: 'blur',
  blockOnError: false,
  textFilterEnabled: true,
  textHitsToBlock: 4,
  extraKeywords: [],
  blockedDomains: [],
  allowedDomains: [],
  debug: false,
}

export interface Stats {
  imagesScanned: number
  imagesBlocked: number
  pagesBlocked: number
}

export const DEFAULT_STATS: Stats = { imagesScanned: 0, imagesBlocked: 0, pagesBlocked: 0 }

/* ---------- הודעות בין סקריפט התוכן, ה-service worker וה-offscreen ---------- */

export interface ClassifyRequest {
  type: 'classify'
  url: string
}

export interface StatsBumpRequest {
  type: 'stats'
  imagesScanned?: number
  imagesBlocked?: number
  pagesBlocked?: number
}

export interface StatusRequest {
  type: 'status'
}

export interface StatusResponse {
  modelReady: boolean
  modelError: string | null
  stats: Stats
  queueLength: number
}

export interface OpenOptionsRequest {
  type: 'openOptions'
}

export type RuntimeRequest =
  | ClassifyRequest
  | StatsBumpRequest
  | StatusRequest
  | OpenOptionsRequest

/** הודעה פנימית מה-service worker אל מסמך ה-offscreen. */
export interface OffscreenClassifyMessage {
  target: 'offscreen'
  type: 'classify'
  url: string
}

/** ה-offscreen מחזיר תחזיות גולמיות בלבד; ההחלטה מתקבלת ב-service worker. */
export interface InferResult {
  predictions?: Prediction[]
  error?: string
}

export interface OffscreenPingMessage {
  target: 'offscreen'
  type: 'ping'
}

export type OffscreenMessage = OffscreenClassifyMessage | OffscreenPingMessage
