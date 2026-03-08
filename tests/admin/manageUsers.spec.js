import { test, expect } from '@playwright/test';
import { loginAdmin, setupMockApi } from '../utils/testHelpers';

test.describe('Admin - Manage Users and Issues', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
  });

  test('admin can manage user approvals, create department, and assign officer', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /user & department management/i })).toBeVisible();

    // Approve a volunteer account.
    const volunteerRow = page.getByRole('row').filter({ hasText: /pending\.volunteer@city\.local/i });
    await volunteerRow.getByRole('button', { name: /no/i }).click();
    await expect(volunteerRow.getByRole('button', { name: /yes/i })).toBeVisible();

    // Create a new department.
    await page.getByPlaceholder(/new department name/i).fill('Urban Drainage Unit');
    await page.getByRole('button', { name: /add department/i }).click();

    // Assign department to officer.
    const officerRow = page.getByRole('row').filter({ hasText: /officer@city\.local/i });
    await officerRow.getByRole('combobox').nth(1).selectOption('Urban Drainage Unit');
  });

  test('admin can moderate issues and override status', async ({ page }) => {
    await page.goto('/admin/manage-issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible();

    const firstStatusSelect = page.getByRole('combobox').first();
    await firstStatusSelect.selectOption('resolved');
    await expect(firstStatusSelect).toHaveValue('resolved');
  });
});
