const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi, openUserMenu } = require('../utils/testHelpers');

test.describe('Citizen Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('shows dashboard header and issue cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my dashboard/i })).toBeVisible();
    await expect(page.locator('.issue-card').first()).toBeVisible();
  });

  test('notifications panel opens from header', async ({ page }) => {
    await page.getByRole('button', { name: /notifications/i }).click();
    await expect(page.getByRole('dialog', { name: /notifications/i })).toBeVisible();
    await expect(page.getByText(/issue update/i)).toBeVisible();
  });

  test('profile link is available in user menu', async ({ page }) => {
    await openUserMenu(page);
    await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
  });
});
