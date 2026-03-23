const { test, expect } = require('@playwright/test');
const { loginAdmin, setupMockApi } = require('../utils/testHelpers');

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  });

  test('shows admin dashboard stats and tables', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.locator('.admin-stats-grid')).toBeVisible();
    await expect(page.locator('table.admin-table')).toBeVisible();
  });
});
