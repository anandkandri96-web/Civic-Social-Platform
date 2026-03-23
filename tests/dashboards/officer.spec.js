const { test, expect } = require('@playwright/test');
const { loginOfficer, setupMockApi } = require('../utils/testHelpers');

test.describe('Officer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginOfficer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
  });

  test('shows officer dashboard stats and issue table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /officer dashboard/i })).toBeVisible();
    await expect(page.locator('table.role-dashboard__table')).toBeVisible();
  });
});
