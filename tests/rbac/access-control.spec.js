const { test, expect } = require('@playwright/test');
const { loginCitizen, loginAdmin, loginVolunteer, setupMockApi } = require('../utils/testHelpers');

test.describe('RBAC - Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('citizen is blocked from admin pages', async ({ page }) => {
    await loginCitizen(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/unauthorized$/);
  });

  test('admin can access admin pages', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /user & department management/i })).toBeVisible();
  });

  test('volunteer cannot access officer dashboard', async ({ page }) => {
    await loginVolunteer(page);
    await page.goto('/dashboard/officer', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/unauthorized$/);
  });
});
