// שרת סטטי מינימלי להגשת dist-test — לבדיקת מנוע הסיווג בדפדפן בלי התוסף.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

// ברירת המחדל היא dist-test; אפשר להעביר תיקייה ופורט אחרים כדי לצפות גם ב-dist.
const ROOT = join(process.cwd(), process.argv[2] ?? 'dist-test')
const PORT = Number(process.argv[3] ?? 5177)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
}

createServer(async (req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0])
  const file = join(ROOT, normalize(path === '/' ? '/index.html' : path))
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`))
