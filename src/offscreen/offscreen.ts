import * as tf from '@tensorflow/tfjs'
// מייבאים מ-nsfwjs/core ולא מ-nsfwjs: נקודת הכניסה הראשית גוררת שלושה מודלים
// ארוזים בתוך החבילה (כ-35MB) שאין בהם צורך — אנחנו טוענים מודל משלנו מהדיסק.
import { load as loadNsfw, type NSFWJS } from 'nsfwjs/core'
import type { ClassifyResult, NsfwClassName, OffscreenMessage, Prediction } from '../shared/types'

/**
 * מסמך ה-offscreen הוא המקום היחיד בתוסף שיש בו DOM + WebGL, ולכן כאן רץ המודל.
 * ה-service worker שולח לכאן כתובת תמונה ומקבל בחזרה פסק דין.
 * המודל נטען מתוך קבצי התוסף — שום בקשה לא יוצאת לרשת חיצונית.
 */

const MODEL_URL = chrome.runtime.getURL('models/mobilenet_v2_mid/model.json')
const MAX_CONCURRENT = 2
const FETCH_TIMEOUT_MS = 8000

let modelPromise: Promise<NSFWJS> | null = null
let inFlight = 0
const waiting: Array<() => void> = []

async function loadModel(): Promise<NSFWJS> {
  try {
    await tf.setBackend('webgl')
  } catch {
    await tf.setBackend('cpu')
  }
  await tf.ready()
  return loadNsfw(MODEL_URL, { type: 'graph' })
}

function getModel(): Promise<NSFWJS> {
  if (!modelPromise) {
    modelPromise = loadModel().catch((error) => {
      // מאפסים כדי שניסיון הבא יטען מחדש ולא ייתקע על שגיאה ישנה.
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

/** חוסם עד שיש מקום פנוי — מונע הצפת ה-GPU בעשרות תמונות בבת אחת. */
async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight += 1
    return
  }
  await new Promise<void>((resolve) => waiting.push(resolve))
  inFlight += 1
}

function releaseSlot(): void {
  inFlight -= 1
  waiting.shift()?.()
}

function scoreOf(
  predictions: Prediction[],
  weights: { sexyWeight: number; drawingWeight: number },
): number {
  const by = (name: NsfwClassName) =>
    predictions.find((p) => p.className === name)?.probability ?? 0
  const raw =
    by('Porn') +
    by('Hentai') +
    by('Sexy') * weights.sexyWeight +
    by('Drawing') * weights.drawingWeight
  return Math.min(1, raw)
}

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (!blob.type.startsWith('image/') && blob.type !== '') {
      throw new Error(`סוג קובץ לא נתמך: ${blob.type}`)
    }
    return await createImageBitmap(blob)
  } finally {
    clearTimeout(timer)
  }
}

async function classify(message: Extract<OffscreenMessage, { type: 'classify' }>): Promise<ClassifyResult> {
  await acquireSlot()
  let bitmap: ImageBitmap | null = null
  let tensor: tf.Tensor3D | null = null
  try {
    const model = await getModel()
    bitmap = await fetchBitmap(message.url)
    tensor = tf.browser.fromPixels(bitmap)
    const predictions = (await model.classify(tensor)) as Prediction[]
    const score = scoreOf(predictions, message.settings)
    return {
      verdict: score >= message.settings.threshold ? 'blocked' : 'safe',
      score,
      predictions,
    }
  } catch (error) {
    return { verdict: 'error', score: 0, reason: String(error) }
  } finally {
    tensor?.dispose()
    bitmap?.close()
    releaseSlot()
  }
}

chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message?.target !== 'offscreen') return undefined

  if (message.type === 'ping') {
    getModel().then(
      () => sendResponse({ ready: true, error: null }),
      (error) => sendResponse({ ready: false, error: String(error) }),
    )
    return true
  }

  if (message.type === 'classify') {
    classify(message).then(sendResponse)
    return true
  }

  return undefined
})

// טעינה מקדימה — המודל מוכן עוד לפני התמונה הראשונה.
void getModel().catch(() => undefined)
