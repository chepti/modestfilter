import { BUILTIN_BLOCKED_DOMAINS, buildKeywordRegex, countKeywordHits } from '../shared/keywords'
import { getSettings, hostMatches } from '../shared/settings'
import type { ClassifyResult, Settings } from '../shared/types'

/**
 * סקריפט התוכן רץ בכל עמוד ובכל פריים.
 * הוא מסתיר תמונות עד שהן נבדקות, שולח כל תמונה לבדיקה ב-service worker,
 * ומחליף כל תמונה שנחסמה בפלייסהולדר — המקור עצמו לא מגיע למסך.
 */

const STATE = 'data-mf-state'
const MAX_CONCURRENT = 6
const TEXT_SCAN_LIMIT = 200_000
const IS_TOP_FRAME = window.top === window

/** פלייסהולדר אטום שמחליף תמונה חסומה. אייקון בסגנון Lucide, stroke 2. */
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="12" fill="#eef1f6"/>
    <g fill="none" stroke="#9aa4b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(48 48)">
      <path d="M9.88 9.88A3 3 0 1 0 14.12 14.12"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </g>
  </svg>`.replace(/\s+/g, ' '),
)}`

let settings: Settings | null = null
let keywordRegex: RegExp | null = null
let pageBlocked = false
let inFlight = 0
const queue: Array<() => void> = []

/* ------------------------------ תשתית עזר ------------------------------ */

function root(): HTMLElement {
  return document.documentElement
}

/** מסתיר תמונות מיד, עוד לפני שההגדרות נטענו — אחרת יש הבזק של תוכן לא מסונן. */
root().classList.add('mf-hide-pending')

function stopHidingPending(): void {
  root().classList.remove('mf-hide-pending')
}

async function slot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight += 1
    return
  }
  await new Promise<void>((resolve) => queue.push(resolve))
  inFlight += 1
}

function releaseSlot(): void {
  inFlight -= 1
  queue.shift()?.()
}

function send<T>(message: unknown): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        // גישה ל-lastError נדרשת כדי ש-Chrome לא ירשום שגיאה בקונסול.
        void chrome.runtime.lastError
        resolve(response ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

function debounce<F extends (...args: never[]) => void>(fn: F, ms: number): F {
  let timer: number | undefined
  return ((...args: Parameters<F>) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), ms)
  }) as F
}

/* ------------------------------ סינון טקסט ------------------------------ */

function collectPageText(): string {
  const meta = [
    document.title,
    decodeURIComponent(location.href),
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    document.querySelector('meta[name="keywords"]')?.getAttribute('content') ?? '',
  ].join(' ')
  const body = document.body?.textContent ?? ''
  return `${meta} ${body}`.slice(0, TEXT_SCAN_LIMIT)
}

function blockPage(reason: string): void {
  if (pageBlocked) return
  pageBlocked = true
  void send({ type: 'stats', pagesBlocked: 1 })

  // עוצרים וידאו ואודיו שכבר מתנגנים.
  document.querySelectorAll('video, audio').forEach((el) => {
    const media = el as HTMLMediaElement
    media.pause()
    media.muted = true
  })

  if (!IS_TOP_FRAME) {
    // בתוך פריים לא מציגים מסך שלם — פשוט מרוקנים אותו.
    root().style.setProperty('display', 'none', 'important')
    return
  }

  const mount = () => {
    if (document.getElementById('mf-page-block')) return
    const overlay = document.createElement('div')
    overlay.id = 'mf-page-block'
    overlay.dir = 'rtl'
    overlay.innerHTML = `
      <div class="mf-card" role="alertdialog" aria-labelledby="mf-title">
        <svg class="mf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <h1 id="mf-title">העמוד הזה נחסם</h1>
        <p>${reason}</p>
        <div class="mf-actions">
          <button class="mf-primary" type="button" data-mf-action="back">חזרה לעמוד הקודם</button>
          <button class="mf-secondary" type="button" data-mf-action="options"
                  title="פתיחת הגדרות התוסף — שם אפשר להוסיף את האתר לרשימת המותרים">הגדרות התוסף</button>
        </div>
        <p class="mf-note">הבדיקה בוצעה במחשב שלך. שום נתון לא נשלח לשרת חיצוני.</p>
      </div>`

    overlay.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest('[data-mf-action]')
      if (!action) return
      if (action.getAttribute('data-mf-action') === 'back') history.back()
      else void send({ type: 'openOptions' })
    })

    document.documentElement.appendChild(overlay)
    document.documentElement.style.setProperty('overflow', 'hidden', 'important')
  }

  if (document.documentElement) mount()
  else document.addEventListener('DOMContentLoaded', mount, { once: true })
}

function scanText(): void {
  if (pageBlocked || !settings?.textFilterEnabled || !keywordRegex) return
  const hits = countKeywordHits(collectPageText(), keywordRegex)
  if (hits >= settings.textHitsToBlock) {
    blockPage(`זוהו ${hits} ביטויים מסומנים בתוכן העמוד.`)
  }
}

/* ------------------------------ סינון תמונות ------------------------------ */

function markSafe(el: Element): void {
  el.setAttribute(STATE, 'safe')
}

function blockImage(img: HTMLImageElement): void {
  const original = img.currentSrc || img.src
  img.setAttribute(STATE, 'blocked')
  img.dataset.mfOriginal = original

  // ב-<picture> הדפדפן בוחר מתוך ה-source — חייבים לנקות גם אותם.
  const picture = img.parentElement
  if (picture instanceof HTMLPictureElement) {
    picture.querySelectorAll('source').forEach((source) => source.removeAttribute('srcset'))
  }

  img.removeAttribute('srcset')
  img.removeAttribute('sizes')
  img.src = PLACEHOLDER
  img.alt = 'תמונה נחסמה על ידי מסנן התוכן'
  img.title = 'התמונה נחסמה על ידי מסנן התוכן'
}

function isScannableUrl(url: string): boolean {
  return /^(https?:|data:image\/)/i.test(url)
}

async function inspect(img: HTMLImageElement): Promise<void> {
  if (!settings || img.hasAttribute(STATE) || img.dataset.mfQueued === '1') return
  img.dataset.mfQueued = '1'

  const url = img.currentSrc || img.src
  const big =
    img.naturalWidth >= settings.minImageSize || img.naturalHeight >= settings.minImageSize
  if (!url || !isScannableUrl(url) || !big) {
    markSafe(img)
    delete img.dataset.mfQueued
    return
  }

  await slot()
  try {
    const result = await send<ClassifyResult>({ type: 'classify', url })
    const verdict = result?.verdict ?? 'error'
    if (verdict === 'blocked' || (verdict === 'error' && settings.blockOnError)) blockImage(img)
    else markSafe(img)
  } finally {
    delete img.dataset.mfQueued
    releaseSlot()
  }
}

/** תמונה נבדקת רק אחרי שנטענה — לפני כן אין לה מידות אמיתיות. */
function consider(img: HTMLImageElement): void {
  if (img.hasAttribute(STATE) || img.dataset.mfQueued === '1') return
  if (img.complete && img.naturalWidth > 0) {
    void inspect(img)
    return
  }
  if (img.dataset.mfWaiting === '1') return
  img.dataset.mfWaiting = '1'
  const done = () => {
    delete img.dataset.mfWaiting
    if (img.naturalWidth > 0) void inspect(img)
    else markSafe(img)
  }
  img.addEventListener('load', done, { once: true })
  img.addEventListener('error', () => {
    delete img.dataset.mfWaiting
    markSafe(img)
  }, { once: true })
}

const imageObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      imageObserver.unobserve(entry.target)
      consider(entry.target as HTMLImageElement)
    }
  },
  { rootMargin: '300px' },
)

function watchImage(img: HTMLImageElement): void {
  if (img.hasAttribute(STATE) || img.dataset.mfWatched === '1') return
  img.dataset.mfWatched = '1'
  imageObserver.observe(img)
}

/* -------------------------- תמונות רקע ב-CSS -------------------------- */

const BG_SCAN_LIMIT = 4000

function backgroundUrl(el: Element): string | null {
  const value = getComputedStyle(el).backgroundImage
  if (!value || value === 'none') return null
  const match = /url\((['"]?)(.*?)\1\)/.exec(value)
  const url = match?.[2]
  return url && isScannableUrl(url) ? url : null
}

async function inspectBackground(el: HTMLElement): Promise<void> {
  if (!settings || el.hasAttribute(STATE)) return
  const rect = el.getBoundingClientRect()
  if (rect.width < settings.minImageSize && rect.height < settings.minImageSize) {
    markSafe(el)
    return
  }
  const url = backgroundUrl(el)
  if (!url) {
    markSafe(el)
    return
  }

  await slot()
  try {
    const result = await send<ClassifyResult>({ type: 'classify', url })
    const verdict = result?.verdict ?? 'error'
    if (verdict === 'blocked' || (verdict === 'error' && settings.blockOnError)) {
      el.setAttribute(STATE, 'blocked-bg')
    } else {
      markSafe(el)
    }
  } finally {
    releaseSlot()
  }
}

const backgroundObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      backgroundObserver.unobserve(entry.target)
      void inspectBackground(entry.target as HTMLElement)
    }
  },
  { rootMargin: '300px' },
)

/** סריקת מועמדים לרקע היא יקרה, ולכן רצה בזמן סרק ועם תקרה קשיחה. */
const scanBackgrounds = debounce(() => {
  if (pageBlocked || !document.body) return
  const run = () => {
    let checked = 0
    for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
      if (checked++ > BG_SCAN_LIMIT) break
      if (el.hasAttribute(STATE) || el.dataset.mfWatched === '1') continue
      if (!backgroundUrl(el)) continue
      el.dataset.mfWatched = '1'
      backgroundObserver.observe(el)
    }
  }
  const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined
  if (idle) idle(run, { timeout: 2000 })
  else window.setTimeout(run, 300)
}, 400)

/* ------------------------------ תצפית על העמוד ------------------------------ */

function scanImages(scope: ParentNode): void {
  if (scope instanceof HTMLImageElement) {
    watchImage(scope)
    return
  }
  scope.querySelectorAll?.('img').forEach((img) => watchImage(img as HTMLImageElement))
}

const rescanText = debounce(scanText, 600)

function startObserving(): void {
  scanImages(document)
  scanBackgrounds()
  scanText()

  new MutationObserver((mutations) => {
    if (pageBlocked) return
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scanImages(node as Element)
        })
      } else if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
        const img = mutation.target
        // אם האתר החזיר את ה-src המקורי אחרי שחסמנו — חוסמים שוב.
        if (img.getAttribute(STATE) === 'blocked' && img.src !== PLACEHOLDER) {
          blockImage(img)
        } else if (img.getAttribute(STATE) === 'safe') {
          img.removeAttribute(STATE)
          delete img.dataset.mfWatched
          watchImage(img)
        }
      }
    }
    scanBackgrounds()
    rescanText()
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'style'],
  })
}

/* ------------------------------ אתחול ------------------------------ */

async function init(): Promise<void> {
  settings = await getSettings()

  const host = location.hostname
  const off =
    !settings.enabled || hostMatches(host, settings.allowedDomains)

  if (off) {
    stopHidingPending()
    return
  }

  if (!settings.hideUntilChecked) stopHidingPending()

  if (
    hostMatches(host, BUILTIN_BLOCKED_DOMAINS) ||
    hostMatches(host, settings.blockedDomains)
  ) {
    stopHidingPending()
    blockPage('האתר הזה נמצא ברשימת האתרים החסומים.')
    return
  }

  keywordRegex = buildKeywordRegex(settings.extraKeywords)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true })
    // התמונות הראשונות עשויות להופיע עוד לפני DOMContentLoaded.
    scanImages(document)
  } else {
    startObserving()
  }
}

init().catch((error) => {
  // כשל באתחול לא אמור להשאיר את העמוד ריק מתמונות.
  console.warn('[מסנן תוכן] אתחול נכשל:', error)
  stopHidingPending()
})
