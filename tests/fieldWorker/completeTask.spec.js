import { test, expect } from '@playwright/test';
import { loginWorker, setupMockApi } from '../utils/testHelpers';

test.describe('Field Worker - Complete Task', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginWorker(page);
    await page.goto('/dashboard/worker', { waitUntil: 'domcontentloaded' });
  });

  test('field worker can accept task, update progress, and mark completed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /worker dashboard/i })).toBeVisible();

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: /accept/i }).click();
    await expect(firstRow).toContainText('accepted');

    await firstRow.getByRole('combobox').selectOption('in_progress');
    await expect(firstRow).toContainText('in_progress');

    await firstRow.getByRole('combobox').selectOption('completed');
    await expect(firstRow).toContainText('completed');
  });
});
