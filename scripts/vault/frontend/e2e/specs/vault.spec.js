const { test, expect, VAULT_PASSWORD } = require('../fixtures')

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
