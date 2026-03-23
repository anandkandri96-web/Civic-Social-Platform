const { test, expect } = require('@playwright/test');
const { setupMockApi } = require('../utils/testHelpers');

test.describe('Auth - Register', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
  });

  test('user can register and gets redirected to login', async ({ page }) => {
    await page.locator('input[name="name"]').fill('New Citizen');
    await page.locator('input[name="email"]').fill(`citizen.new.${Date.now()}@city.local`);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('.register-error')).toContainText(/valid email/i);
  });
});
