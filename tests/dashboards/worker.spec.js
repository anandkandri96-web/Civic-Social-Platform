const { test, expect } = require('@playwright/test');
const { loginWorker, setupMockApi } = require('../utils/testHelpers');

test.describe('Worker Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginWorker(page);
    await page.goto('/dashboard/worker', { waitUntil: 'domcontentloaded' });
  });

  test('shows worker profile and tasks', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /worker dashboard/i })).toBeVisible();
    await expect(page.locator('.worker-dashboard__profile')).toBeVisible();
    await expect(page.locator('.task-card').first()).toBeVisible();
  });
});
