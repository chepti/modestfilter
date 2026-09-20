import { renderFooter } from '../ui/footer'
import { getStats, parseList, resetStats, saveSettings, getSettings } from '../shared/settings'
import { DEFAULT_SETTINGS, type Settings } from '../shared/types'

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

const fields = {
  threshold: $<HTMLInputElement>('threshold'),
  sexyWeight: $<HTMLInputElement>('sexyWeight'),
  drawingWeight: $<HTMLInputElement>('drawingWeight'),
  minImageSize: $<HTMLInputElement>('minImageSize'),
  hideUntilChecked: $<HTMLInputElement>('hideUntilChecked'),
  blockOnError: $<HTMLInputElement>('blockOnError'),
  textFilterEnabled: $<HTMLInputElement>('textFilterEnabled'),
  textHitsToBlock: $<HTMLInputElement>('textHitsToBlock'),
  extraKeywords: $<HTMLTextAreaElement>('extraKeywords'),
  blockedDomains: $<HTMLTextAreaElement>('blockedDomains'),
  allowedDomains: $<HTMLTextAreaElement>('allowedDomains'),
}

/** הסבר מילולי לסף — מספר יבש לא אומר הרבה למשתמש. */
function thresholdWording(value: number): string {
  if (value <= 0.3) return 'מחמיר מאוד — יחסום גם תמונות גבוליות, וגם כמה תמימות.'
  if (value <= 0.55) return 'מאוזן — ההמלצה לרוב המשתמשים.'
  return 'מקל — יחסום רק תוכן מפורש בבירור.'
}

function syncRangeOutputs(): void {
  $('threshold-out').textContent = Number(fields.threshold.value).toFixed(2)
  $('sexyWeight-out').textContent = Number(fields.sexyWeight.value).toFixed(1)
  $('drawingWeight-out').textContent = Number(fields.drawingWeight.value).toFixed(1)
  $('threshold-hint').textContent = thresholdWording(Number(fields.threshold.value))
}

function fill(settings: Settings): void {
  fields.threshold.value = String(settings.threshold)
  fields.sexyWeight.value = String(settings.sexyWeight)
  fields.drawingWeight.value = String(settings.drawingWeight)
  fields.minImageSize.value = String(settings.minImageSize)
  fields.hideUntilChecked.checked = settings.hideUntilChecked
  fields.blockOnError.checked = settings.blockOnError
  fields.textFilterEnabled.checked = settings.textFilterEnabled
  fields.textHitsToBlock.value = String(settings.textHitsToBlock)
  fields.extraKeywords.value = settings.extraKeywords.join('\n')
  fields.blockedDomains.value = settings.blockedDomains.join('\n')
  fields.allowedDomains.value = settings.allowedDomains.join('\n')
  syncRangeOutputs()
}

function collect(): Partial<Settings> {
  return {
    threshold: Number(fields.threshold.value),
    sexyWeight: Number(fields.sexyWeight.value),
    drawingWeight: Number(fields.drawingWeight.value),
    minImageSize: Math.max(16, Number(fields.minImageSize.value) || DEFAULT_SETTINGS.minImageSize),
    hideUntilChecked: fields.hideUntilChecked.checked,
    blockOnError: fields.blockOnError.checked,
    textFilterEnabled: fields.textFilterEnabled.checked,
    textHitsToBlock: Math.max(1, Number(fields.textHitsToBlock.value) || DEFAULT_SETTINGS.textHitsToBlock),
    extraKeywords: parseList(fields.extraKeywords.value),
    blockedDomains: parseList(fields.blockedDomains.value),
    allowedDomains: parseList(fields.allowedDomains.value),
  }
}

function flashSaved(): void {
  const el = $('saved')
  el.classList.add('show')
  window.setTimeout(() => el.classList.remove('show'), 2400)
}

async function showStats(): Promise<void> {
  const stats = await getStats()
  $('stats-line').textContent =
    `${stats.imagesScanned} תמונות נבדקו, ${stats.imagesBlocked} הוסתרו, ${stats.pagesBlocked} עמודים נחסמו.`
}

for (const input of [fields.threshold, fields.sexyWeight, fields.drawingWeight]) {
  input.addEventListener('input', syncRangeOutputs)
}

$('save').addEventListener('click', async () => {
  await saveSettings(collect())
  flashSaved()
})

$('reset').addEventListener('click', async () => {
  fill(DEFAULT_SETTINGS)
  await saveSettings(DEFAULT_SETTINGS)
  flashSaved()
})

$('reset-stats').addEventListener('click', async () => {
  await resetStats()
  await showStats()
})

renderFooter($('footer'))
void getSettings().then(fill)
void showStats()
