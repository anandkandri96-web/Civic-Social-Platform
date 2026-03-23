const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('Citizen - View Issues', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('citizen can view homepage issue sections', async ({ page }) => {
    await loginCitizen(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /priority issues/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /city-wide issue heatmap/i })).toBeVisible();
  });

  test('citizen can open issue details from list view', async ({ page }) => {
    await loginCitizen(page);

    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();

    await page.getByRole('link', { name: /broken streetlight/i }).click();
    await expect(page.getByRole('heading', { name: /broken streetlight/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /issue resolution/i })).toBeVisible();
  });
});
