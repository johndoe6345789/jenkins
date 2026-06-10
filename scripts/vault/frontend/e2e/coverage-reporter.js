#!/usr/bin/env node
/**
 * Reads raw V8 coverage (NDJSON written by fixtures.js), fetches the
 * source maps that Next.js serves alongside each bundle, converts to
 * Istanbul format via v8-to-istanbul, and prints a per-source-file
 * summary mapped back to the original JSX/JS files.
 *
 *   node e2e/coverage-reporter.js
 */
const { createReadStream } = require('fs')
const { mkdir, writeFile } = require('fs/promises')
const { join, relative } = require('path')
const readline = require('readline')
const http    = require('http')
const v8toIstanbul = require('v8-to-istanbul')

const RAW  = join(__dirname, '../coverage/e2e/raw/coverage.ndjson')
const OUT  = join(__dirname, '../coverage/e2e')
const ROOT = join(__dirname, '..')          // frontend/

// ── HTTP helper ──────────────────────────────────────────────────────────────

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} ${url}`))
      }
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => resolve(body))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ── NDJSON reader ────────────────────────────────────────────────────────────

async function readEntries() {
  const all = []
  const rl = readline.createInterface({ input: createReadStream(RAW) })
  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const { entries } = JSON.parse(line)
      if (Array.isArray(entries)) all.push(...entries)
    } catch { /* skip malformed */ }
  }
  return all
}

function dedup(entries) {
  const map = new Map()
  for (const e of entries) {
    const prev = map.get(e.url)
    if (!prev || (e.functions?.length ?? 0) > (prev.functions?.length ?? 0))
      map.set(e.url, e)
  }
  return [...map.values()]
}

// ── Source-map cache ─────────────────────────────────────────────────────────

const mapCache = new Map()

async function fetchSourceMap(url) {
  if (mapCache.has(url)) return mapCache.get(url)
  try {
    const text = await fetchText(url + '.map')
    const sm   = { sourcemap: JSON.parse(text) }
    mapCache.set(url, sm)
    return sm
  } catch {
    mapCache.set(url, null)
    return null
  }
}

// ── Path normalisation ────────────────────────────────────────────────────────

function normalisePath(key) {
  // v8-to-istanbul resolves webpack:// sources relative to the script URL,
  // producing absolute paths like:
  //   …/frontend/http:/…/_N_E/components/Header.jsx
  // Extract everything after the webpack project-name segment (_N_E for Next.js).
  const wpMatch = key.match(/_N_E\/(.+)$/)
  if (wpMatch) {
    const rel = wpMatch[1].replace(/^\.\//, '')
    // Drop webpack internals: ?(hash), (webpack)/…, etc.
    if (rel.startsWith('(') || rel.startsWith('?') || rel.startsWith('webpack/'))
      return null
    return rel
  }
  // Fallback for entries without source maps (absolute paths)
  const rel = relative(ROOT, key).replace(/\\/g, '/')
  if (rel.startsWith('..')) return null
  return rel
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let allEntries
  try {
    allEntries = await readEntries()
  } catch {
    console.error('No coverage file — run `npm run e2e` first.')
    process.exit(1)
  }
  if (!allEntries.length) {
    console.error('Coverage file is empty.')
    process.exit(1)
  }

  const entries = dedup(allEntries).filter(
    e =>
      e.url.includes('/_next/') &&
      !e.url.includes('webpack') &&
      !e.url.includes('polyfills'),
  )

  const totals = { stmts: 0, cov: 0, funcs: 0, fcov: 0 }
  const byFile = new Map()   // rel path → {sCov, sTotal, fCov, fTotal}

  for (const entry of entries) {
    const sourceMap = await fetchSourceMap(entry.url)
    try {
      const converter = v8toIstanbul(entry.url, undefined, {
        source: entry.source ?? '',
        ...(sourceMap ? { sourceMap } : {}),
      })
      await converter.load()
      converter.applyCoverage(entry.functions ?? [])
      const data = converter.toIstanbul()

      for (const [key, fc] of Object.entries(data)) {
        const rel = normalisePath(key)
        if (!rel) continue
        if (rel.includes('node_modules')) continue
        // Only report our own source files
        if (
          !rel.startsWith('app/') &&
          !rel.startsWith('components/') &&
          !rel.startsWith('hooks/') &&
          !rel.startsWith('lib/')
        ) continue

        const sCounts = fc.s ? Object.values(fc.s) : []
        const fIds    = fc.fnMap ? Object.keys(fc.fnMap) : []
        const fCounts = fc.f ?? {}

        const sCov = sCounts.filter(n => n > 0).length
        const fCov = fIds.filter(id => (fCounts[id] ?? 0) > 0).length

        const prev = byFile.get(rel) ?? { sCov: 0, sTotal: 0, fCov: 0, fTotal: 0 }
        byFile.set(rel, {
          sCov:   Math.max(prev.sCov,   sCov),
          sTotal: Math.max(prev.sTotal, sCounts.length),
          fCov:   Math.max(prev.fCov,   fCov),
          fTotal: Math.max(prev.fTotal, fIds.length),
        })
      }
    } catch { /* skip unconvertible entries */ }
  }

  const rows = []
  for (const [file, { sCov, sTotal, fCov, fTotal }] of byFile) {
    totals.stmts += sTotal
    totals.cov   += sCov
    totals.funcs += fTotal
    totals.fcov  += fCov
    const sPct = sTotal ? `${((sCov / sTotal) * 100).toFixed(1)}%` : 'n/a'
    const fPct = fTotal ? `${((fCov / fTotal) * 100).toFixed(1)}%` : 'n/a'
    rows.push({ file, sPct, fPct })
  }

  const gS = totals.stmts ? `${((totals.cov  / totals.stmts) * 100).toFixed(1)}%` : '0%'
  const gF = totals.funcs ? `${((totals.fcov / totals.funcs) * 100).toFixed(1)}%` : '0%'

  console.log('\n  Playwright E2E coverage (source-mapped)\n')
  console.log('  ' + 'File'.padEnd(55) + 'Stmts'.padStart(8) + 'Funcs'.padStart(8))
  console.log('  ' + '─'.repeat(71))
  for (const r of rows.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(
      '  ' + r.file.padEnd(55) + r.sPct.padStart(8) + r.fPct.padStart(8),
    )
  }
  console.log('  ' + '─'.repeat(71))
  console.log(
    '  ' + 'All files'.padEnd(55) + gS.padStart(8) + gF.padStart(8),
  )
  console.log()

  await mkdir(OUT, { recursive: true })
  await writeFile(
    join(OUT, 'summary.json'),
    JSON.stringify({ stmts: gS, funcs: gF, rows }, null, 2),
  )
  console.log(`  Written to coverage/e2e/summary.json\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
