const { test: base, expect } = require('@playwright/test')
const { mkdir, appendFile } = require('fs/promises')
const { readFileSync } = require('fs')
const { join } = require('path')

const COV_DIR = join(__dirname, '../coverage/e2e/raw')

const VAULT_ENV = join(__dirname, '../../../../secrets/vault.env')
const VAULT_PASSWORD = readFileSync(VAULT_ENV, 'utf8')
  .split('\n')
  .find(l => l.startsWith('VAULT_MASTER_PASSWORD='))
  ?.split('=')[1]
  ?.trim()

if (!VAULT_PASSWORD) {
  throw new Error(`VAULT_MASTER_PASSWORD not found in ${VAULT_ENV}`)
}

const test = base.extend({
  // Wrap every test in V8 JS coverage collection (Chromium only)
  page: async ({ page }, use, testInfo) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await use(page)
    const entries = await page.coverage.stopJSCoverage()
    await mkdir(COV_DIR, { recursive: true })
    const safe = testInfo.title.replace(/\W+/g, '-').slice(0, 60)
    await appendFile(
      join(COV_DIR, 'coverage.ndjson'),
      JSON.stringify({ test: safe, entries }) + '\n',
    )
  },

  // Real login against the live backend
  authedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', VAULT_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/vault')
    await use(page)
  },
})

module.exports = { test, expect, VAULT_PASSWORD }
