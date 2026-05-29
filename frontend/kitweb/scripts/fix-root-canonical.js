import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { absoluteUrl } from '../src/utils/siteUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = join(__dirname, '..', 'dist', 'index.html')
const ROOT_CANONICAL = absoluteUrl('/')

function replaceCanonical(html, href) {
  const pattern = /(<link[^>]+rel="canonical"[^>]+href=")[^"]+("[^>]*>)/i
  return html.replace(pattern, `$1${href}$2`)
}

function replaceXDefault(html, href) {
  const pattern = /(<link[^>]+rel="alternate"[^>]+hreflang="x-default"[^>]+href=")[^"]+("[^>]*>)/i
  return html.replace(pattern, `$1${href}$2`)
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error(`Missing ${INDEX_PATH}. Run "vite-ssg build" first.`)
  }

  let html = readFileSync(INDEX_PATH, 'utf8')
  html = replaceCanonical(html, ROOT_CANONICAL)
  html = replaceXDefault(html, ROOT_CANONICAL)
  writeFileSync(INDEX_PATH, html, 'utf8')

  console.log(`[fix-root-canonical] Set dist/index.html canonical to ${ROOT_CANONICAL}`)
}

main()
