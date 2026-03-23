const { test, expect } = require('@playwright/test');
const { loginOfficer, setupMockApi } = require('../utils/testHelpers');

test.describe('Officer - Department Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginOfficer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
  });

  test('shows officer dashboard and analytics link', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /officer dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view analytics/i })).toBeVisible();
  });
});
