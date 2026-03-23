const { test, expect } = require('@playwright/test');
const { loginVolunteer, setupMockApi } = require('../utils/testHelpers');

test.describe('Volunteer - Claim Issue', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginVolunteer(page);
  });

  test('volunteer can claim an available issue', async ({ page }) => {
    await page.goto('/dashboard/volunteer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /volunteer dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /volunteer actions/i })).toBeVisible();

    const firstRow = page.locator('table.role-dashboard__table tbody tr').first();
    const claimButton = firstRow.getByRole('button', { name: /claim/i });
    const startFixButton = firstRow.getByRole('button', { name: /start fix/i });

    await expect(claimButton).toBeEnabled();
    await claimButton.click();

    await expect(claimButton).toBeDisabled();
    await expect(startFixButton).toBeEnabled();
  });
});
