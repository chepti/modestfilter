import { renderFooter } from '../ui/footer'
import { getSettings, hostMatches, normalizeHost, saveSettings } from '../shared/settings'
import type { StatusResponse } from '../shared/types'

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

const enabled = $<HTMLInputElement>('enabled')
const siteAllowed = $<HTMLInputElement>('site-allowed')
const siteLabel = $<HTMLElement>('site-label')
const modelDot = $<HTMLElement>('model-dot')
const modelText = $<HTMLElement>('model-text')

let currentHost = ''
let currentTabId: number | undefined

async function loadTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  currentTabId = tab?.id
  try {
    currentHost = normalizeHost(new URL(tab?.url ?? '').hostname)
  } catch {
    currentHost = ''
  }
  if (currentHost) {
    siteLabel.lastChild!.textContent = ` ${currentHost}`
    siteLabel.title = `כיבוי הסינון ב-${currentHost} בלבד`
  } else {
    siteAllowed.disabled = true
  }
}

async function loadSettings(): Promise<void> {
  const settings = await getSettings()
  enabled.checked = settings.enabled
  siteAllowed.checked = Boolean(currentHost) && hostMatches(currentHost, settings.allowedDomains)
}

async function loadStatus(): Promise<void> {
  const status = await chrome.runtime.sendMessage({ type: 'status' }) as StatusResponse | undefined
  if (!status) return
  $('stat-scanned').textContent = String(status.stats.imagesScanned)
  $('stat-blocked').textContent = String(status.stats.imagesBlocked)
  $('stat-pages').textContent = String(status.stats.pagesBlocked)

  modelDot.classList.toggle('ok', status.modelReady)
  modelDot.classList.toggle('bad', !status.modelReady)
  modelText.textContent = status.modelReady
    ? 'מנוע הזיהוי טעון ופעיל'
    : `מנוע הזיהוי אינו זמין${status.modelError ? ` — ${status.modelError}` : ''}`
  modelText.title = status.modelReady
    ? 'המודל רץ מקומית במחשב, ללא שליחת תמונות לרשת'
    : 'ודאו שהרצתם npm run model לפני הבנייה'
}

enabled.addEventListener('change', () => {
  void saveSettings({ enabled: enabled.checked })
})

siteAllowed.addEventListener('change', async () => {
  if (!currentHost) return
  const settings = await getSettings()
  const list = settings.allowedDomains.filter((item) => normalizeHost(item) !== currentHost)
  if (siteAllowed.checked) list.push(currentHost)
  await saveSettings({ allowedDomains: list })
})

$('open-options').addEventListener('click', () => {
  void chrome.runtime.openOptionsPage()
})

$('reload').addEventListener('click', () => {
  if (currentTabId !== undefined) void chrome.tabs.reload(currentTabId)
  window.close()
})

renderFooter($('footer'))
void loadTab().then(loadSettings)
void loadStatus()
