import { readFileSync, readdirSync, statSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { absoluteUrl } from '../src/utils/siteUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

function collectHtmlFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectHtmlFiles(fullPath))
      continue
    }

    if (entry.endsWith('.html')) {
      files.push(fullPath)
    }
  }

  return files
}

function htmlPathToUrl(filePath) {
  const relativePath = relative(DIST, filePath).replace(/\\/g, '/')

  if (relativePath === 'index.html') {
    return absoluteUrl('/')
  }

  if (relativePath.endsWith('/index.html')) {
    return absoluteUrl(`/${relativePath.slice(0, -'/index.html'.length)}`)
  }

  if (relativePath.endsWith('.html')) {
    return absoluteUrl(`/${relativePath.slice(0, -'.html'.length)}`)
  }

  throw new Error(`Unexpected HTML path: ${relativePath}`)
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)
  if (!match) {
    return null
  }

  const hrefMatch = match[0].match(/href=["']([^"']+)["']/i)
  return hrefMatch?.[1] ?? null
}

function main() {
  const htmlFiles = collectHtmlFiles(DIST)
  const failures = []

  for (const filePath of htmlFiles.sort()) {
    const html = readFileSync(filePath, 'utf8')
    const expected = htmlPathToUrl(filePath)
    const canonical = extractCanonical(html)

    if (!canonical) {
      failures.push(`${relative(DIST, filePath)}: missing canonical tag`)
      continue
    }

    if (canonical !== expected) {
      failures.push(`${relative(DIST, filePath)}: expected ${expected}, got ${canonical}`)
    }
  }

  if (failures.length) {
    console.error('[verify-canonicals] Failed:')
    failures.forEach((failure) => console.error(`  - ${failure}`))
    process.exit(1)
  }

  console.log(`[verify-canonicals] OK: ${htmlFiles.length} HTML files have matching canonical tags`)
}

main()
