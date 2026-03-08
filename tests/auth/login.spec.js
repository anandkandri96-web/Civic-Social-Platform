import { test, expect } from '@playwright/test';
import { loginCitizen, loginVolunteer, loginOfficer, loginWorker, loginAdmin, setupMockApi } from '../utils/testHelpers';

test.describe('Auth - Login', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('citizen can log in and reach citizen dashboard', async ({ page }) => {
    await loginCitizen(page);
  });

  test('volunteer can log in and reach volunteer dashboard', async ({ page }) => {
    await loginVolunteer(page);
  });

  test('department officer can log in and reach officer dashboard', async ({ page }) => {
    await loginOfficer(page);
  });

  test('field worker can log in and reach worker dashboard', async ({ page }) => {
    await loginWorker(page);
  });

  test('system admin can log in and reach admin dashboard', async ({ page }) => {
    await loginAdmin(page);
  });

  test('login page is accessible from homepage navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /log in/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
