const { test, expect } = require('@playwright/test');
const { setupMockApi } = require('../utils/testHelpers');

test.describe('UI - Form Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('login password toggle shows and hides password', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('register password toggle shows and hides password', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
