import { test, expect } from '@playwright/test';
import { setupMockApi } from '../utils/testHelpers';

test.describe('Auth - Register', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
  });

  test('citizen can register and gets redirected to login', async ({ page }) => {
    await page.locator('input[name=\"name\"]').fill('New Citizen');
    await page.locator('input[name=\"email\"]').fill(`citizen.new.${Date.now()}@city.local`);
    await page.locator('input[name=\"password\"]').fill('Password123!');
    await page.locator('select[name=\"role\"]').selectOption('citizen');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('volunteer can register from role selector', async ({ page }) => {
    await page.locator('input[name=\"name\"]').fill('New Volunteer');
    await page.locator('input[name=\"email\"]').fill(`volunteer.new.${Date.now()}@city.local`);
    await page.locator('input[name=\"password\"]').fill('Password123!');
    await page.locator('select[name=\"role\"]').selectOption('volunteer');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
