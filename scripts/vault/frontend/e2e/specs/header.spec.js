const { test, expect } = require('../fixtures')

test.describe('Header', () => {
  test('shows Vault title', async ({ authedPage: page }) => {
    await expect(page.locator('header h6')).toContainText('Vault')
  })

  test('dark mode shows LightModeIcon by default', async ({
    authedPage: page,
  }) => {
    await expect(page.locator('[data-testid="LightModeIcon"]')).toBeVisible()
  })

  test('theme toggle switches to light mode (DarkModeIcon appears)', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await expect(page.locator('[data-testid="DarkModeIcon"]')).toBeVisible()
  })

  test('theme toggle switches back to dark mode', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('theme-toggle-btn').click()
    await page.getByTestId('theme-toggle-btn').click()
    await expect(page.locator('[data-testid="LightModeIcon"]')).toBeVisible()
  })

  test('avatar button is visible', async ({ authedPage: page }) => {
    await expect(page.getByTestId('avatar-btn')).toBeVisible()
  })

  test('avatar click opens user menu', async ({ authedPage: page }) => {
    await page.getByTestId('avatar-btn').click()
    await expect(page.getByTestId('logout-btn')).toBeVisible()
  })

  test('logout from avatar menu redirects to /login', async ({
    authedPage: page,
  }) => {
    await page.getByTestId('avatar-btn').click()
    await page.getByTestId('logout-btn').click()
    await expect(page).toHaveURL('/login')
  })

  test('language selector switches to French', async ({
    authedPage: page,
  }) => {
    const selectDisplay = page.locator('.MuiSelect-select').first()
    await selectDisplay.click()
    await page.getByRole('option', { name: 'FR' }).click()
    await expect(page.getByTestId('rotate-all-btn-jenkins')).toContainText(
      'Tout renouveler',
    )
  })

  test('burger button is visible', async ({ authedPage: page }) => {
    await expect(page.getByTestId('burger-btn')).toBeVisible()
  })
})

test.describe('Nav drawer', () => {
  test('opens on burger click', async ({ authedPage: page }) => {
    await page.getByTestId('burger-btn').click()
    await expect(page.getByTestId('nav-link-jenkins')).toBeVisible()
    await expect(page.getByTestId('nav-link-frontends')).toBeVisible()
  })

  test('Jenkins link closes drawer', async ({ authedPage: page }) => {
    await page.getByTestId('burger-btn').click()
    await page.getByTestId('nav-link-jenkins').click()
    await expect(page.getByTestId('nav-link-jenkins')).not.toBeVisible()
  })

  test('Frontends link closes drawer', async ({ authedPage: page }) => {
    await page.getByTestId('burger-btn').click()
    await page.getByTestId('nav-link-frontends').click()
    await expect(page.getByTestId('nav-link-frontends')).not.toBeVisible()
  })
})
