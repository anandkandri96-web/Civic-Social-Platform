const { test, expect } = require('@playwright/test');
const { loginWorker, setupMockApi } = require('../utils/testHelpers');

test.describe('Worker - Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginWorker(page);
    await page.goto('/dashboard/worker', { waitUntil: 'domcontentloaded' });
  });

  test('worker can accept a task', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /worker dashboard/i })).toBeVisible();

    const taskCard = page.locator('.task-card').first();
    await expect(taskCard.getByRole('button', { name: /accept task/i })).toBeVisible();

    await taskCard.getByRole('button', { name: /accept task/i }).click();
    await expect(taskCard.locator('.task-status')).toContainText(/accepted/i);
  });
});
