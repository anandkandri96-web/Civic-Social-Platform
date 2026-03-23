const { test, expect } = require('@playwright/test');
const {
  setupMockApi,
  loginCitizen,
  loginVolunteer,
  loginOfficer,
  loginWorker,
  loginAdmin,
} = require('../utils/testHelpers');

test.describe('Auth - Login', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('login page loads with required fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /social civic platform/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.login-error')).toContainText(/valid email/i);
  });

  test('short password shows validation error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('citizen@city.local');
    await page.locator('input[name="password"]').fill('123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.login-error')).toContainText(/password must be 6-128/i);
  });

  test('citizen can sign in', async ({ page }) => {
    await loginCitizen(page);
  });

  test('volunteer can sign in', async ({ page }) => {
    await loginVolunteer(page);
  });

  test('officer can sign in', async ({ page }) => {
    await loginOfficer(page);
  });

  test('worker can sign in', async ({ page }) => {
    await loginWorker(page);
  });

  test('admin can sign in', async ({ page }) => {
    await loginAdmin(page);
  });
});
