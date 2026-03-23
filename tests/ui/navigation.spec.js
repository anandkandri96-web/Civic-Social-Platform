const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi, openUserMenu } = require('../utils/testHelpers');

test.describe('UI - App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('header includes issues, map, and dashboard links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /issues/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /map/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });

  test('avatar menu opens with profile and logout', async ({ page }) => {
    await openUserMenu(page);
    await expect(page.getByRole('menuitem', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
  });
});
