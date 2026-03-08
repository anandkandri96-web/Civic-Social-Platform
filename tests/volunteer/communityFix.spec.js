import { test, expect } from '@playwright/test';
import { loginVolunteer, setupMockApi } from '../utils/testHelpers';

test.describe('Volunteer - Community Fix', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginVolunteer(page);
    await page.goto('/dashboard/volunteer', { waitUntil: 'domcontentloaded' });
  });

  test('volunteer can move issue to community fix and resolve it', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();

    // Claim issue.
    await firstRow.getByRole('button', { name: /claim/i }).click();
    await expect(firstRow).toContainText('volunteer_claimed');

    // Start fix workflow.
    await firstRow.getByRole('button', { name: /start fix/i }).click();
    await expect(firstRow).toContainText('community_fix_in_progress');

    // Resolve with proof prompt.
    page.once('dialog', async (dialog) => {
      await dialog.accept('https://example.com/before.jpg,https://example.com/after.jpg');
    });
    await firstRow.getByRole('button', { name: /resolve/i }).click();

    await expect(firstRow).toContainText('resolved_by_community');
  });
});
