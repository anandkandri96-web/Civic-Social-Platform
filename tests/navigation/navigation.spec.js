import { test, expect } from '@playwright/test';
import { setupMockApi } from '../utils/testHelpers';

test.describe('Global Navigation', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('homepage loads with hero and primary sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /better cities/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /priority issues/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /city-wide issue heatmap/i })).toBeVisible();
  });

  test('main menu links open issues, workflow, login and register pages', async ({ page }) => {
    await page.getByRole('link', { name: /workflow/i }).first().click();
    await expect(page).toHaveURL(/\/workflow$/);
    await expect(page.getByRole('heading', { name: /social civic platform workflow/i })).toBeVisible();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /log in/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /register/i }).first().click({ force: true });
    await expect(page).toHaveURL(/\/register$/);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /browse issues|view all issues/i }).first().click();
    await expect(page).toHaveURL(/\/issues$/);
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
  });

  test('map visualization and markers render on homepage', async ({ page }) => {
    await expect(page.getByText(/live \| civicpulse map/i)).toBeVisible();
    await expect(page.getByTitle(/intensity/i).first()).toBeVisible();
  });
});
