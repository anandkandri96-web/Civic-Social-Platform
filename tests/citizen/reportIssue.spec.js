const { test, expect } = require('@playwright/test');
const { createIssue, loginCitizen, logoutFromNavbar, setupMockApi } = require('../utils/testHelpers');

test.describe('Citizen - Report Issue Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('citizen can report an issue and comment on it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /better cities/i })).toBeVisible();

    await loginCitizen(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /report issue/i }).first().click();

    const createdTitle = await createIssue(page);

    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
    await page.getByRole('link', { name: createdTitle }).click();

    await expect(page.getByRole('heading', { name: createdTitle })).toBeVisible();

    await page.getByPlaceholder(/write a comment/i).fill('This needs urgent attention from the city team.');
    await page.getByRole('button', { name: /^post$/i }).click();
    await expect(page.getByText('This needs urgent attention from the city team.')).toBeVisible();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await logoutFromNavbar(page);
  });
});
