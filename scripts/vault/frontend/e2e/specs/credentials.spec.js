const { test, expect } = require('../fixtures')

test.describe('Credential row', () => {
  test('password is masked by default', async ({ authedPage: page }) => {
    await expect(page.getByTestId('pw-cell-uksodev')).toContainText('•')
  })

  test('Show reveals the password', async ({ authedPage: page }) => {
    await page.getByTestId('show-btn-uksodev').click()
    const cell = page.getByTestId('pw-cell-uksodev')
    await expect(cell).not.toContainText('•')
    await expect(cell).not.toContainText('—')
  })

  test('Hide masks the password again', async ({ authedPage: page }) => {
    await page.getByTestId('show-btn-uksodev').click()
    await page.getByTestId('show-btn-uksodev').click()
    await expect(page.getByTestId('pw-cell-uksodev')).toContainText('•')
  })

  test('Copy writes to clipboard and shows toast', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('copy-btn-uksodev').click()
    await expect(page.getByText('Password copied')).toBeVisible()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip.length).toBeGreaterThan(0)
  })

  test('Rotate shows success toast', async ({ authedPage: page }) => {
    await page.getByTestId('rotate-btn-uksodev').click()
    await expect(page.getByText('Rotated uksodev')).toBeVisible()
  })

  test('Rotate with API error shows error toast', async ({
    authedPage: page,
  }) => {
    // Inject a backend error to test the frontend error-display path
    await page.route('/api/rotate/admin', route =>
      route.fulfill({ json: { ok: false, error: 'container offline' } }),
    )
    await page.getByTestId('rotate-btn-admin').click()
    await expect(page.getByText('container offline')).toBeVisible()
  })

  test('Rotate with no error field shows fallback toast', async ({
    authedPage: page,
  }) => {
    await page.route('/api/rotate/admin', route =>
      route.fulfill({ json: { ok: false } }),
    )
    await page.getByTestId('rotate-btn-admin').click()
    await expect(page.getByText('Rotation failed')).toBeVisible()
  })

  test('Rotate with network failure shows error toast', async ({
    authedPage: page,
  }) => {
    await page.route('/api/rotate/admin', route =>
      route.abort('failed'),
    )
    await page.getByTestId('rotate-btn-admin').click()
    await expect(page.locator('.MuiAlert-filledError').first()).toBeVisible()
  })
})

test.describe('Section rotate-all', () => {
  test('rotates all Jenkins targets and shows success toast', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('rotate-all-btn-jenkins').click()
    await expect(page.getByText(/all \d+ rotated/i)).toBeVisible()
  })

  test('reports partial failure in toast', async ({ authedPage: page }) => {
    let n = 0
    await page.route('/api/rotate/**', route => {
      n++
      route.fulfill({
        json: n === 1 ? { ok: true, password: 'pw' } : { ok: false },
      })
    })
    await page.getByTestId('rotate-all-btn-jenkins').click()
    await expect(page.getByText(/rotated.*failed/i)).toBeVisible()
  })
})
