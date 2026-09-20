import type { NsfwClassName, Prediction, Settings } from './types'

/**
 * הציון המשוקלל מתוך חמש הקטגוריות של המודל.
 * Porn ו-Hentai תמיד במשקל מלא; Sexy ו-Drawing לפי ההגדרות.
 *
 * החישוב נמצא בצד ה-service worker ולא ב-offscreen בכוונה: כך אפשר לשמור
 * במטמון את תחזיות המודל עצמן ולחשב מחדש מול ההגדרות הנוכחיות. אחרת שינוי
 * רמת ההקפדה לא היה משפיע על תמונות שכבר נבדקו.
 */
export function scoreOf(
  predictions: Prediction[],
  weights: Pick<Settings, 'sexyWeight' | 'drawingWeight'>,
): number {
  const by = (name: NsfwClassName) =>
    predictions.find((p) => p.className === name)?.probability ?? 0
  return Math.min(
    1,
    by('Porn') + by('Hentai') + by('Sexy') * weights.sexyWeight + by('Drawing') * weights.drawingWeight,
  )
}
