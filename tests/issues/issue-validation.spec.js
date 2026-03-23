const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('Issues - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
  });

  test('details step blocks invalid title/description', async ({ page }) => {
    await page.goto('/issues/create', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /pin location/i })).toBeVisible();

    await page.getByPlaceholder(/latitude/i).fill('12.9716');
    await page.getByPlaceholder(/longitude/i).fill('77.5946');
    await page.getByPlaceholder(/area or landmark/i).fill('Main Market Road');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /issue details/i })).toBeVisible();

    const continueButton = page.getByRole('button', { name: /continue/i });
    await page.getByPlaceholder(/issue title/i).fill('123');
    await page.getByPlaceholder(/describe the issue/i).fill('Too short');
    await expect(continueButton).toBeDisabled();

    await page.getByPlaceholder(/issue title/i).fill('Streetlight outage');
    await page.getByPlaceholder(/describe the issue/i).fill('Streetlight has been out for more than a week near the market area.');
    await expect(continueButton).toBeEnabled();
  });
});
