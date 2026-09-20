import * as tf from '@tensorflow/tfjs'
import { load as loadNsfw } from 'nsfwjs/core'

// עמוד בדיקה לפיתוח בלבד: מוודא שהמודל שבתיקיית models נטען ומסווג כראוי.
// אינו נארז בתוסף (נבנה בנפרד, ראו npm run build:devtest).

const out = document.getElementById('out') as HTMLPreElement
const log = (line: string) => {
  out.textContent += `\n${line}`
}

async function main() {
  out.textContent = 'backend…'
  try {
    await tf.setBackend('webgl')
  } catch {
    await tf.setBackend('cpu')
  }
  await tf.ready()
  log(`backend = ${tf.getBackend()}`)

  const t0 = performance.now()
  const model = await loadNsfw('./models/mobilenet_v2_mid/model.json', { type: 'graph' })
  log(`model loaded in ${Math.round(performance.now() - t0)}ms`)

  for (const url of ['./devtest/sample-flat.png', './devtest/sample-noise.png']) {
    const blob = await (await fetch(url)).blob()
    const bitmap = await createImageBitmap(blob)
    const tensor = tf.browser.fromPixels(bitmap)
    const t1 = performance.now()
    const predictions = await model.classify(tensor)
    log(
      `${url} (${bitmap.width}x${bitmap.height}) in ${Math.round(performance.now() - t1)}ms → ` +
        predictions.map((p) => `${p.className}=${p.probability.toFixed(3)}`).join('  '),
    )
    tensor.dispose()
    bitmap.close()
  }
  log('OK')
}

main().catch((error) => log(`FAIL: ${error}`))
