import { test, expect } from '@playwright/test';
import { loginOfficer, setupMockApi } from '../utils/testHelpers';

test.describe('Department Officer - Assign Worker', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginOfficer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
  });

  test('officer can review issue, assign worker, and set work in progress', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();

    await firstRow.getByRole('button', { name: /review/i }).click();
    await expect(firstRow).toContainText('under_review');

    await firstRow.getByPlaceholder(/worker id/i).fill('worker-1001');
    await firstRow.getByRole('button', { name: /assign/i }).click();
    await expect(firstRow).toContainText('assigned_to_department');

    await firstRow.getByRole('combobox').selectOption('work_in_progress');
    await expect(firstRow).toContainText('work_in_progress');
  });
});
