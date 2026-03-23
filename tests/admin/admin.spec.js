const { test, expect } = require('@playwright/test');
const { loginAdmin, setupMockApi } = require('../utils/testHelpers');

test.describe('Admin - Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
  });

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
  });

  test('admin user management loads', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /user & department management/i })).toBeVisible();
    await expect(page.locator('table.user-table')).toBeVisible();
  });

  test('admin issue moderation loads', async ({ page }) => {
    await page.goto('/admin/manage-issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible();
    await expect(page.locator('.manage-issues-list')).toBeVisible();
  });
});
