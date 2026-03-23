const { test, expect } = require('@playwright/test');
const { loginCitizen, setupMockApi } = require('../utils/testHelpers');

test.describe('Issues - Detail', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
  });

  test('detail page shows title and resolution section', async ({ page }) => {
    await page.goto('/issues/issue-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /broken streetlight/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /issue resolution/i })).toBeVisible();
  });

  test('user can post a comment', async ({ page }) => {
    await page.goto('/issues/issue-1', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder(/write a comment/i).fill('Please prioritize this.');
    await page.getByRole('button', { name: /^post$/i }).click();
    await expect(page.getByText('Please prioritize this.')).toBeVisible();
  });
});
