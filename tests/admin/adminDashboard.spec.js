import { test, expect } from '@playwright/test';
import { loginAdmin, setupMockApi } from '../utils/testHelpers';

test.describe('Admin - Dashboard and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginAdmin(page);
  });

  test('admin can open dashboard and view platform analytics', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText(/total issues/i)).toBeVisible();

    await page.getByRole('link', { name: /view analytics/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
    await expect(page.getByRole('heading', { name: /admin analytics/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /top issue heatmap areas/i })).toBeVisible();
    await expect(page.getByText(/weight/i).first()).toBeVisible();
  });
});
