const { test, expect } = require('@playwright/test');
const { setupMockApi } = require('../utils/testHelpers');

test.describe('Global Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('homepage loads with hero and primary sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /better cities/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /how social civic platform works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /city-wide issue heatmap/i })).toBeVisible();
  });

  test('nav links open workflow, login, register, and issues', async ({ page }) => {
    await page.getByRole('link', { name: /workflow/i }).first().click();
    await expect(page).toHaveURL(/\/workflow$/);
    await expect(page.getByRole('heading', { name: /workflow/i })).toBeVisible();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /log in/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /register/i }).first().click();
    await expect(page).toHaveURL(/\/register$/);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /browse issues|issues/i }).first().click();
    await expect(page).toHaveURL(/\/issues$/);
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
  });

  test('map preview section renders', async ({ page }) => {
    await expect(page.locator('.map-canvas')).toBeVisible();
  });
});
