import { renderFooter } from '../ui/footer'
import { getStats, parseList, resetStats, saveSettings, getSettings } from '../shared/settings'
import { DEFAULT_SETTINGS, type Settings } from '../shared/types'

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

const fields = {
  strictness: $<HTMLInputElement>('strictness'),
  sexyWeight: $<HTMLInputElement>('sexyWeight'),
  drawingWeight: $<HTMLInputElement>('drawingWeight'),
  minImageSize: $<HTMLInputElement>('minImageSize'),
  hideUntilChecked: $<HTMLInputElement>('hideUntilChecked'),
  pendingStyle: $<HTMLSelectElement>('pendingStyle'),
  blockOnError: $<HTMLInputElement>('blockOnError'),
  textFilterEnabled: $<HTMLInputElement>('textFilterEnabled'),
  textHitsToBlock: $<HTMLInputElement>('textHitsToBlock'),
  extraKeywords: $<HTMLTextAreaElement>('extraKeywords'),
  blockedDomains: $<HTMLTextAreaElement>('blockedDomains'),
  allowedDomains: $<HTMLTextAreaElement>('allowedDomains'),
  debug: $<HTMLInputElement>('debug'),
}

/**
 * המחוון מציג "רמת הקפדה" — גבוה יותר = מחמיר יותר — בעוד שבהגדרות נשמר סף
 * חסימה, שבו גבוה יותר = מקל יותר. השניים הפוכים, ולכן ההמרה כאן.
 */
const strictnessToThreshold = (percent: number): number => 1 - percent / 100
const thresholdToStrictness = (threshold: number): number => Math.round((1 - threshold) * 100)

/** הסבר מילולי — מספר יבש לא אומר הרבה למשתמש. */
function strictnessWording(percent: number): string {
  if (percent >= 80) return 'מחמיר מאוד — יחסום גם תמונות גבוליות, ולעיתים גם תמימות.'
  if (percent >= 45) return 'מאוזן — ההמלצה לרוב המשתמשים.'
  return 'מקל — יחסום רק תוכן מפורש בבירור.'
}

function syncRangeOutputs(): void {
  const percent = Number(fields.strictness.value)
  $('strictness-out').textContent = `${percent}%`
  $('sexyWeight-out').textContent = Number(fields.sexyWeight.value).toFixed(1)
  $('drawingWeight-out').textContent = Number(fields.drawingWeight.value).toFixed(1)
  $('strictness-hint').textContent = strictnessWording(percent)
}

function fill(settings: Settings): void {
  fields.strictness.value = String(thresholdToStrictness(settings.threshold))
  fields.sexyWeight.value = String(settings.sexyWeight)
  fields.drawingWeight.value = String(settings.drawingWeight)
  fields.minImageSize.value = String(settings.minImageSize)
  fields.hideUntilChecked.checked = settings.hideUntilChecked
  fields.pendingStyle.value = settings.pendingStyle
  fields.blockOnError.checked = settings.blockOnError
  fields.textFilterEnabled.checked = settings.textFilterEnabled
  fields.textHitsToBlock.value = String(settings.textHitsToBlock)
  fields.extraKeywords.value = settings.extraKeywords.join('\n')
  fields.blockedDomains.value = settings.blockedDomains.join('\n')
  fields.allowedDomains.value = settings.allowedDomains.join('\n')
  fields.debug.checked = settings.debug
  syncRangeOutputs()
}

function collect(): Partial<Settings> {
  return {
    threshold: strictnessToThreshold(Number(fields.strictness.value)),
    sexyWeight: Number(fields.sexyWeight.value),
    drawingWeight: Number(fields.drawingWeight.value),
    minImageSize: Math.max(16, Number(fields.minImageSize.value) || DEFAULT_SETTINGS.minImageSize),
    hideUntilChecked: fields.hideUntilChecked.checked,
    pendingStyle: fields.pendingStyle.value === 'hidden' ? 'hidden' : 'blur',
    blockOnError: fields.blockOnError.checked,
    textFilterEnabled: fields.textFilterEnabled.checked,
    textHitsToBlock: Math.max(1, Number(fields.textHitsToBlock.value) || DEFAULT_SETTINGS.textHitsToBlock),
    extraKeywords: parseList(fields.extraKeywords.value),
    blockedDomains: parseList(fields.blockedDomains.value),
    allowedDomains: parseList(fields.allowedDomains.value),
    debug: fields.debug.checked,
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

for (const input of [fields.strictness, fields.sexyWeight, fields.drawingWeight]) {
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
