const { test, expect } = require('../fixtures')

function rgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

// Must stay in sync with DARK_PALETTE / LIGHT_PALETTE in lib/ClientThemeProvider.tsx
const DARK  = { bg: rgb('#0d0d1a'), paper: rgb('#16162a'), primary: rgb('#7c6ff7') }
const LIGHT = { bg: rgb('#f0eff8'), paper: rgb('#ffffff'), primary: rgb('#5b4fcf') }

const themeBg  = page =>
  page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-testid="theme-bg"]')).backgroundColor,
  )

const bodyBg = page =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

const sectionBg = page =>
  page.evaluate(() =>
    getComputedStyle(
      document.querySelector('[data-testid="section-jenkins"] .MuiPaper-root'),
    ).backgroundColor,
  )

const lockIconColour = page =>
  page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-testid="login-lock-icon"]')).color,
  )

async function waitFor(page, sel, color) {
  await page.waitForFunction(
    ({ s, c }) => getComputedStyle(document.querySelector(s)).backgroundColor === c,
    { s: sel, c: color },
    { timeout: 5000 },
  )
}

test.describe('Dark mode (default)', () => {
  test('page background', async ({ authedPage: page }) => {
    expect(await themeBg(page)).toBe(DARK.bg)
  })

  test('section paper background', async ({ authedPage: page }) => {
    await page.getByTestId('section-jenkins').waitFor()
    expect(await sectionBg(page)).toBe(DARK.paper)
  })

  test('login page background', async ({ page }) => {
    await page.goto('/login')
    expect(await themeBg(page)).toBe(DARK.bg)
  })

  test('login lock icon is primary colour', async ({ page }) => {
    await page.goto('/login')
    expect(await lockIconColour(page)).toBe(DARK.primary)
  })
})

test.describe('Light mode (after toggle)', () => {
  test('body background turns lavender (no dark chin)', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="theme-bg"]', LIGHT.bg)
    expect(await bodyBg(page)).toBe(LIGHT.bg)
  })

  test('body background reverts to dark on second toggle', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="theme-bg"]', DARK.bg)
    expect(await bodyBg(page)).toBe(DARK.bg)
  })

  test('page background turns lavender', async ({ authedPage: page }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="theme-bg"]', LIGHT.bg)
    expect(await themeBg(page)).toBe(LIGHT.bg)
  })

  test('section paper turns white', async ({ authedPage: page }) => {
    await page.getByTestId('section-jenkins').waitFor()
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="section-jenkins"] .MuiPaper-root', LIGHT.paper)
    expect(await sectionBg(page)).toBe(LIGHT.paper)
  })

  test('page background reverts to dark on second toggle', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="theme-bg"]', DARK.bg)
    expect(await themeBg(page)).toBe(DARK.bg)
  })

  test('section paper reverts to dark on second toggle', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('section-jenkins').waitFor()
    await page.getByTestId('theme-toggle-btn').click()
    await page.getByTestId('theme-toggle-btn').click()
    await waitFor(page, '[data-testid="section-jenkins"] .MuiPaper-root', DARK.paper)
    expect(await sectionBg(page)).toBe(DARK.paper)
  })
})
