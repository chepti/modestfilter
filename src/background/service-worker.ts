import { bumpStats, getSettings, getStats } from '../shared/settings'
import { scoreOf } from '../shared/score'
import type {
  ClassifyResult,
  InferResult,
  Prediction,
  RuntimeRequest,
  StatusResponse,
} from '../shared/types'

/**
 * ה-service worker הוא הנתב: סקריפט התוכן שולח אליו כתובות תמונה, הוא מוודא
 * שמסמך ה-offscreen חי, מעביר אליו את הבקשה, ושומר תוצאות במטמון כדי שאותה
 * תמונה לא תיבדק פעמיים.
 */

const OFFSCREEN_PATH = 'offscreen/offscreen.html'
const CACHE_LIMIT = 800

// המטמון שומר את תחזיות המודל, לא את פסק הדין: שינוי רמת ההקפדה משפיע מיד
// גם על תמונות שכבר נבדקו, בלי לסווג אותן שוב.
const cache = new Map<string, Prediction[]>()
let modelError: string | null = null
let modelReady = false
let pending = 0

function remember(url: string, predictions: Prediction[]): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(url, predictions)
}

let creating: Promise<void> | null = null

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (contexts.length > 0) return

  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_PATH,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'הרצת מודל סיווג התמונות NSFWJS, שדורש DOM ו-WebGL.',
      })
      .finally(() => {
        creating = null
      })
  }
  await creating
}

async function classifyUrl(url: string): Promise<ClassifyResult> {
  const settings = await getSettings()

  const decide = (predictions: Prediction[]): ClassifyResult => {
    const score = scoreOf(predictions, settings)
    return { verdict: score >= settings.threshold ? 'blocked' : 'safe', score, predictions }
  }

  const cached = cache.get(url)
  if (cached) return decide(cached)

  await ensureOffscreen()

  pending += 1
  try {
    const inferred = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'classify',
      url,
    })) as InferResult

    if (!inferred?.predictions) {
      modelError = inferred?.error ?? 'שגיאה לא ידועה'
      return { verdict: 'error', score: 0, reason: modelError }
    }

    modelReady = true
    modelError = null
    remember(url, inferred.predictions)

    const result = decide(inferred.predictions)
    void bumpStats({
      imagesScanned: 1,
      imagesBlocked: result.verdict === 'blocked' ? 1 : 0,
    })
    return result
  } catch (error) {
    modelError = String(error)
    return { verdict: 'error', score: 0, reason: modelError }
  } finally {
    pending -= 1
  }
}

async function buildStatus(): Promise<StatusResponse> {
  try {
    await ensureOffscreen()
    const ping = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'ping' })) as
      | { ready: boolean; error: string | null }
      | undefined
    if (ping) {
      modelReady = ping.ready
      modelError = ping.error
    }
  } catch (error) {
    modelReady = false
    modelError = String(error)
  }
  return { modelReady, modelError, stats: await getStats(), queueLength: pending }
}

chrome.runtime.onMessage.addListener((message: RuntimeRequest & { target?: string }, _sender, sendResponse) => {
  // הודעות שמיועדות ל-offscreen עוברות דרך אותו ערוץ — לא נוגעים בהן.
  if (message?.target === 'offscreen') return undefined

  switch (message?.type) {
    case 'classify':
      classifyUrl(message.url).then(sendResponse)
      return true
    case 'stats':
      void bumpStats({
        imagesScanned: message.imagesScanned,
        imagesBlocked: message.imagesBlocked,
        pagesBlocked: message.pagesBlocked,
      })
      return undefined
    case 'status':
      buildStatus().then(sendResponse)
      return true
    case 'openOptions':
      void chrome.runtime.openOptionsPage()
      return undefined
    default:
      return undefined
  }
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.runtime.openOptionsPage()
  }
  void ensureOffscreen()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureOffscreen()
})
