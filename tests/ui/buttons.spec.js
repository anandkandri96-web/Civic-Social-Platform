const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('UI - Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('home hero buttons render for guests', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view live map/i })).toBeVisible();
  });

  test('report issue button appears for signed-in users', async ({ page }) => {
    await loginCitizen(page);
    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /report issue/i })).toBeVisible();
  });
});
