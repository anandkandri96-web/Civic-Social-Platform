const { test, expect } = require('@playwright/test');
const { setupMockApi } = require('./utils/testHelpers');

test('home page renders hero and sections', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /better cities/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /how social civic platform works/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /priority issues/i })).toBeVisible();
});
