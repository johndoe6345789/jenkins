const { test, expect } = require('../fixtures')

test.describe('Refresh persistence', () => {
  test('refresh on /vault stays on /vault', async ({ authedPage: page }) => {
    await expect(page).toHaveURL('/vault')
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL('/vault')
  })

  test('refresh on /vault/service page stays on that page', async ({ authedPage: page }) => {
    // Navigate to a service page directly
    await page.goto('/vault/service/pyracms')
    await page.waitForURL(/\/vault\/service\/pyracms/)

    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL('/vault/service/pyracms')
  })

  test('localStorage token is set after login', async ({ authedPage: page }) => {
    const token = await page.evaluate(() => localStorage.getItem('vault_token'))
    expect(token).toBeTruthy()
  })

  test('after refresh, token still in localStorage', async ({ authedPage: page }) => {
    await page.reload()
    await page.waitForTimeout(500)
    const token = await page.evaluate(() => localStorage.getItem('vault_token'))
    expect(token).toBeTruthy()
  })

  test('URL after refresh', async ({ authedPage: page }) => {
    await page.reload()
    // Wait for any redirect to settle
    await page.waitForLoadState('networkidle')
    console.log('URL after refresh:', page.url())
    await expect(page).toHaveURL('/vault')
  })
})
