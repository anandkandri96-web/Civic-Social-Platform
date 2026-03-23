const { test, expect } = require('@playwright/test');
const { createIssue, loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('Issues - Create', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
  });

  test('citizen can complete issue report wizard', async ({ page }) => {
    const createdTitle = await createIssue(page);
    await expect(page.getByRole('heading', { name: createdTitle })).toBeVisible();
  });

  test('wizard disables continue until required fields are filled', async ({ page }) => {
    await page.goto('/issues/create', { waitUntil: 'domcontentloaded' });
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled();

    await continueButton.click();
    await expect(page.getByRole('heading', { name: /pin location/i })).toBeVisible();

    await expect(continueButton).toBeDisabled();
  });
});
