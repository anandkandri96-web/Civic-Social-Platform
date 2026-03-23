const { test, expect } = require('@playwright/test');
const { loginVolunteer, setupMockApi } = require('../utils/testHelpers');

test.describe('Volunteer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginVolunteer(page);
    await page.goto('/dashboard/volunteer', { waitUntil: 'domcontentloaded' });
  });

  test('shows volunteer stats and action table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /volunteer dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /volunteer actions/i })).toBeVisible();
    await expect(page.locator('table.role-dashboard__table')).toBeVisible();
  });
});
