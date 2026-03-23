const { test, expect } = require('@playwright/test');
const { setupMockApi, loginCitizen, logoutFromNavbar } = require('../utils/testHelpers');

test.describe('Auth - Logout', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('logout clears session and returns to home', async ({ page }) => {
    await loginCitizen(page);
    await logoutFromNavbar(page);
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
});
