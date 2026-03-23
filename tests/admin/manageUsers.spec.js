const { test, expect } = require('@playwright/test');
const { loginAdmin, setupMockApi } = require('../utils/testHelpers');

test.describe('Admin - Manage Users and Issues', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
  });

  test('admin can manage user approvals and create departments', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /user & department management/i })).toBeVisible();

    const volunteerRow = page.getByRole('row').filter({ hasText: /pending\.volunteer@city\.local/i });
    await volunteerRow.getByRole('button', { name: /^no$/i }).click();
    await expect(volunteerRow.getByRole('button', { name: /^yes$/i })).toBeVisible();

    await page.getByPlaceholder(/new department name/i).fill('Urban Drainage Unit');
    await page.getByRole('button', { name: /add department/i }).click();

    const officerRow = page.getByRole('row').filter({ hasText: /officer@city\.local/i });
    await officerRow.getByRole('combobox').nth(1).selectOption({ label: 'Urban Drainage Unit' });
  });

  test('admin can moderate issue status', async ({ page }) => {
    await page.goto('/admin/manage-issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible();

    const firstStatusSelect = page.getByRole('combobox').first();
    await firstStatusSelect.selectOption('resolved');
    await expect(firstStatusSelect).toHaveValue('resolved');
  });
});
