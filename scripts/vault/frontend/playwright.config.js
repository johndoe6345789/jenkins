const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e/specs',
  testMatch: '**/*.spec.js',
  testIgnore: ['**/__tests__/**', '**/*.test.{js,jsx}'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://vault.wardcrew.com',
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
