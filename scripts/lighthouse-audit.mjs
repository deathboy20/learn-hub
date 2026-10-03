import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

/** Run against production: `pnpm build && PORT=3001 pnpm start` then PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:lighthouse */
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const minScore = Number(process.env.LIGHTHOUSE_MIN_SCORE ?? 90)
const paths = ['/', '/login']

async function audit(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] })
  try {
    const result = await lighthouse(url, {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    })
    const categories = result?.lhr?.categories ?? {}
    const scores = Object.fromEntries(
      Object.entries(categories).map(([key, cat]) => [key, Math.round((cat.score ?? 0) * 100)]),
    )
    return scores
  } finally {
    await chrome.kill()
  }
}

let failed = false
for (const path of paths) {
  const url = `${base}${path}`
  const scores = await audit(url)
  console.log(`\nLighthouse ${url}`)
  for (const [cat, score] of Object.entries(scores)) {
    console.log(`  ${cat}: ${score}`)
    if (score < minScore) {
      failed = true
      console.error(`  ✗ ${cat} below ${minScore}`)
    }
  }
}

if (failed) process.exit(1)
console.log(`\nAll public routes scored ≥ ${minScore}.`)
