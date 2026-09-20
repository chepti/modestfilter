import { DEFAULT_SETTINGS, DEFAULT_STATS, type Settings, type Stats } from './types'

const SETTINGS_KEY = 'settings'
const STATS_KEY = 'stats'

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.sync.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(raw[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next })
  return next
}

export function onSettingsChanged(cb: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[SETTINGS_KEY]) return
    cb({ ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue as Partial<Settings>) })
  })
}

export async function getStats(): Promise<Stats> {
  const raw = await chrome.storage.local.get(STATS_KEY)
  return { ...DEFAULT_STATS, ...(raw[STATS_KEY] as Partial<Stats> | undefined) }
}

export async function bumpStats(delta: Partial<Stats>): Promise<Stats> {
  const current = await getStats()
  const next: Stats = {
    imagesScanned: current.imagesScanned + (delta.imagesScanned ?? 0),
    imagesBlocked: current.imagesBlocked + (delta.imagesBlocked ?? 0),
    pagesBlocked: current.pagesBlocked + (delta.pagesBlocked ?? 0),
  }
  await chrome.storage.local.set({ [STATS_KEY]: next })
  return next
}

export async function resetStats(): Promise<void> {
  await chrome.storage.local.set({ [STATS_KEY]: DEFAULT_STATS })
}

/** נרמול הוסט לצורך השוואה מול רשימות: בלי www ובאותיות קטנות. */
export function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '')
}

/** האם הוסט נמצא ברשימה — התאמה מדויקת או תת-דומיין. */
export function hostMatches(hostname: string, list: string[]): boolean {
  const host = normalizeHost(hostname)
  return list.some((entry) => {
    const item = normalizeHost(entry.trim())
    if (!item) return false
    return host === item || host.endsWith(`.${item}`)
  })
}

/** המרת טקסט חופשי משדה קלט לרשימה נקייה. */
export function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
}
