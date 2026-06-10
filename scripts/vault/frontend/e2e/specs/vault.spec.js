const { test, expect, VAULT_PASSWORD } = require('../fixtures')

test.describe('Light mode', () => {
  test('theme-bg carries data-theme="dark" by default', async ({ authedPage: page }) => {
    await expect(page.getByTestId('theme-bg')).toHaveAttribute('data-theme', 'dark')
  })

  test('toggling theme sets data-theme="light"', async ({ authedPage: page }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await expect(page.getByTestId('theme-bg')).toHaveAttribute('data-theme', 'light')
  })

  test('light mode updates --surf2 CSS variable to a light colour', async ({ authedPage: page }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await expect(page.getByTestId('theme-bg')).toHaveAttribute('data-theme', 'light')

    const surf2 = await page.getByTestId('theme-bg').evaluate(el =>
      getComputedStyle(el).getPropertyValue('--surf2').trim()
    )
    // In dark mode this is #1e1e36; in light mode it must be a pale value.
    expect(surf2).toBe('#eceaf6')
  })

  test('page background is light in light mode', async ({ authedPage: page }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await expect(page.getByTestId('theme-bg')).toHaveAttribute('data-theme', 'light')

    // theme-bg has bgcolor='background.default' from MUI theme.
    // Dark: rgb(13,13,26)  Light: rgb(240,239,248)
    const bg = await page.getByTestId('theme-bg').evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    const r = parseInt(bg.match(/\d+/)[0], 10)
    expect(r).toBeGreaterThan(200)
  })
})

test.describe('Vault page', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/vault')
    await expect(page).toHaveURL('/login')
  })

  test('renders Jenkins section', async ({ authedPage: page }) => {
    await expect(page.getByTestId('section-jenkins')).toBeVisible()
  })

  test('renders Frontends section', async ({ authedPage: page }) => {
    await expect(page.getByTestId('section-frontends')).toBeVisible()
  })

  test('shows all Jenkins credential rows', async ({ authedPage: page }) => {
    for (const name of ['uksodev', 'admin', 'nexus-admin']) {
      await expect(page.getByTestId(`cred-row-${name}`)).toBeVisible()
    }
  })

  test('each section has a Rotate all button', async ({
    authedPage: page,
  }) => {
    await expect(page.getByTestId('rotate-all-btn-jenkins')).toBeVisible()
    await expect(page.getByTestId('rotate-all-btn-frontends')).toBeVisible()
  })

  test('redirects to /login when /api/targets returns 401', async ({
    page,
  }) => {
    await page.route('/api/targets', r =>
      r.fulfill({ status: 401, json: { error: 'unauthenticated' } }),
    )
    await page.goto('/login')
    await page.fill('input[type="password"]', VAULT_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/login')
  })
})
