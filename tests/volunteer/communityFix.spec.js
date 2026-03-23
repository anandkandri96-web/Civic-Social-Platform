const { test, expect } = require('@playwright/test');
const { loginVolunteer, setupMockApi } = require('../utils/testHelpers');

test.describe('Volunteer - Community Fix', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginVolunteer(page);
    await page.goto('/dashboard/volunteer', { waitUntil: 'domcontentloaded' });
  });

  test('volunteer can start fix and open submit form', async ({ page }) => {
    const firstRow = page.locator('table.role-dashboard__table tbody tr').first();

    await firstRow.getByRole('button', { name: /claim/i }).click();
    await firstRow.getByRole('button', { name: /start fix/i }).click();

    await firstRow.getByRole('link', { name: /open submit form/i }).click();
    await expect(page.getByRole('heading', { name: /submit resolution/i })).toBeVisible();
  });
});
