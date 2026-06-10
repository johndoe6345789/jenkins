const { test, expect, VAULT_PASSWORD } = require('../fixtures')

test.describe('Login page', () => {
  test('/ redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('shows title and subtitle', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Vault')).toBeVisible()
    await expect(page.getByText('Jenkins credential manager')).toBeVisible()
  })

  test('submit disabled when password field is empty', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /unlock/i })).toBeDisabled()
  })

  test('submit enabled after typing a password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', 'abc')
    await expect(page.getByRole('button', { name: /unlock/i })).toBeEnabled()
  })

  test('wrong password shows error alert', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', 'definitely-wrong-password')
    await page.click('button[type="submit"]')
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid password' })).toBeVisible()
  })

  test('correct password navigates to /vault', async ({ authedPage: page }) => {
    await expect(page).toHaveURL('/vault')
  })

  test('shows Unlocking… while submitting', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="password"]', VAULT_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page.getByRole('button', { name: /unlocking/i })).toBeVisible()
  })
})
