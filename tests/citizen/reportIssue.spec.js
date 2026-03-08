import { test, expect } from '@playwright/test';
import { createIssue, loginCitizen, logoutFromNavbar, setupMockApi } from '../utils/testHelpers';

test.describe('Citizen - Report Issue Lifecycle', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('citizen can report issue, see it in list and details, and log out', async ({ page }) => {
    // Step 1: open homepage.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /better cities/i })).toBeVisible();

    // Step 2-4: navigate to register/login flow and sign in as citizen.
    await page.getByRole('link', { name: /register/i }).first().click();
    await expect(page).toHaveURL(/\/register$/);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await loginCitizen(page);

    // Step 5-7: map view and report issue path are reachable.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /city-wide issue heatmap/i })).toBeVisible();
    await page.getByRole('link', { name: /report issue/i }).first().click();

    // Step 8-10: fill and submit issue report with photo.
    const createdTitle = await createIssue(page);

    // Step 11-13: verify in issue list and open details.
    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: createdTitle })).toBeVisible();
    await page.getByRole('link', { name: /view/i }).first().click();
    await expect(page.getByRole('heading', { name: createdTitle })).toBeVisible();

    // Step 15: add comment.
    await page.getByPlaceholder(/write a comment/i).fill('This needs urgent attention from the city team.');
    await page.getByRole('button', { name: /post comment/i }).click();
    await expect(page.getByText('This needs urgent attention from the city team.')).toBeVisible();

    // Step 16: logout.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await logoutFromNavbar(page);
  });
});
