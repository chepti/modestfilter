import { bumpStats, getSettings, getStats } from '../shared/settings'
import type {
  ClassifyResult,
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

const cache = new Map<string, ClassifyResult>()
let modelError: string | null = null
let modelReady = false
let pending = 0

function remember(url: string, result: ClassifyResult): void {
  if (result.verdict === 'error') return
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(url, result)
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
  const cached = cache.get(url)
  if (cached) return cached

  const settings = await getSettings()
  await ensureOffscreen()

  pending += 1
  try {
    const result = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'classify',
      url,
      settings: {
        threshold: settings.threshold,
        sexyWeight: settings.sexyWeight,
        drawingWeight: settings.drawingWeight,
      },
    })) as ClassifyResult

    if (result.verdict === 'error') {
      modelError = result.reason ?? 'שגיאה לא ידועה'
    } else {
      modelReady = true
      modelError = null
    }

    remember(url, result)
    void bumpStats({
      imagesScanned: 1,
      imagesBlocked: result.verdict === 'blocked' ? 1 : 0,
    })
    return result
  } catch (error) {
    const failure: ClassifyResult = { verdict: 'error', score: 0, reason: String(error) }
    modelError = failure.reason ?? null
    return failure
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
