import { test, expect } from '@playwright/test';
import { loginCitizen, setupMockApi } from '../utils/testHelpers';

test.describe('Citizen - Vote Issue', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginCitizen(page);
  });

  test('citizen can vote for an issue from issue list', async ({ page }) => {
    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();

    const voteButton = page.locator('button.vote-button').first();
    await expect(voteButton).toBeVisible();
    await voteButton.click();

    await expect(voteButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('citizen can open issue details and verify vote UI is available', async ({ page }) => {
    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /view/i }).first().click();
    await expect(page.locator('button.vote-button')).toBeVisible();
  });
});
