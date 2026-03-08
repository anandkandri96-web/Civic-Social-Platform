import { test, expect } from '@playwright/test';
import { loginOfficer, setupMockApi } from '../utils/testHelpers';

test.describe('Department Officer - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginOfficer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
  });

  test('officer dashboard shows incoming issues and analytics entry', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /officer dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /department queue/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view analytics/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /issue/i })).toBeVisible();
  });

  test('officer can update issue to resolved after monitoring progress', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('combobox').selectOption('resolved');
    await expect(firstRow).toContainText('resolved');
  });
});
