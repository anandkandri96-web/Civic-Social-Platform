import { test, expect } from '@playwright/test';
import { loginVolunteer, setupMockApi } from '../utils/testHelpers';

test.describe('Volunteer - Claim Issue', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await loginVolunteer(page);
  });

  test('volunteer can open unresolved queue, filter context, and claim issue', async ({ page }) => {
    await page.goto('/dashboard/volunteer', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /volunteer dashboard/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /volunteer actions/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /category/i })).toBeVisible();

    // Select first issue and claim it.
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: /claim/i }).click();

    await expect(firstRow).toContainText('volunteer_claimed');
  });
});
