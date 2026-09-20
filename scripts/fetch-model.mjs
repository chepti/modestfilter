// מוריד את מודל NSFWJS אל public/models כדי שייארז בתוך התוסף.
// MV3 אוסר טעינת מודל מרשת חיצונית בזמן ריצה, ולכן ההורדה היא שלב בנייה חד-פעמי.

import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'mobilenet_v2_mid'
const BASE = `https://raw.githubusercontent.com/infinitered/nsfwjs/master/models/${MODEL}/`
const OUT = join(ROOT, 'public', 'models', MODEL)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function download(name) {
  const target = join(OUT, name)
  if (await exists(target)) {
    console.log(`  קיים כבר: ${name}`)
    return null
  }
  const response = await fetch(BASE + name)
  if (!response.ok) throw new Error(`הורדת ${name} נכשלה: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, buffer)
  console.log(`  הורד: ${name} (${(buffer.length / 1024).toFixed(0)} KB)`)
  return buffer
}

async function main() {
  console.log(`מוריד את מודל ${MODEL} אל public/models/${MODEL}`)
  await mkdir(OUT, { recursive: true })

  const modelJsonPath = join(OUT, 'model.json')
  let modelJsonBuffer = await download('model.json')
  if (!modelJsonBuffer) modelJsonBuffer = await readFile(modelJsonPath)

  // שמות קבצי המשקולות נקראים מתוך המניפסט עצמו, כדי לא לקודד אותם קשיח.
  const manifest = JSON.parse(modelJsonBuffer.toString('utf8'))
  const shards = manifest.weightsManifest.flatMap((group) => group.paths)
  for (const shard of shards) await download(shard)

  console.log('המודל מוכן. אפשר להריץ npm run build')
}

main().catch((error) => {
  console.error('\nהורדת המודל נכשלה:', error.message)
  console.error(
    `אפשר להוריד ידנית מ-${BASE} את model.json ואת קבצי group1-shard*, ` +
      `ולשים אותם ב-public/models/${MODEL}/`,
  )
  process.exit(1)
})
