const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('Issues - Lifecycle Basics', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
  });

  test('issue list shows status badges', async ({ page }) => {
    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
    await expect(page.locator('.issue-card__status').first()).toBeVisible();
  });
});
