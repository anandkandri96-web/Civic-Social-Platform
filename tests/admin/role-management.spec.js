const { test, expect } = require('@playwright/test');
const { loginAdmin, setupMockApi } = require('../utils/testHelpers');

test.describe('Admin - Role Upgrade Requests', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
    await page.goto('/admin/role-upgrades', { waitUntil: 'domcontentloaded' });
  });

  test('shows role upgrade request table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /role upgrade requests/i })).toBeVisible();
    await expect(page.locator('table.role-requests__grid')).toBeVisible();
  });

  test('can filter requests by status', async ({ page }) => {
    await page.getByRole('combobox').selectOption('approved');
    await expect(page.getByRole('combobox')).toHaveValue('approved');
  });
});
