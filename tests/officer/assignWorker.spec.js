const { test, expect } = require('@playwright/test');
const { loginOfficer, setupMockApi } = require('../utils/testHelpers');

test.describe('Officer - Assign Worker', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginOfficer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
  });

  test('officer can assign a worker from dropdown', async ({ page }) => {
    const firstRow = page.locator('table.role-dashboard__table tbody tr').first();
    await firstRow.getByRole('button', { name: /review/i }).click();

    const workerSelect = firstRow.getByRole('combobox').first();
    await workerSelect.selectOption({ index: 1 });

    const assignButton = firstRow.getByRole('button', { name: /assign/i });
    await expect(assignButton).toBeEnabled();
    await assignButton.click();

    await expect(firstRow).toContainText(/assigned_to_department/i);
  });
});
