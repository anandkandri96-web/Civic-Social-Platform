import { test, expect } from '@playwright/test';
import { loginCitizen, setupMockApi } from '../utils/testHelpers';

test.describe('Citizen - View Issues and Map', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
  });

  test('citizen can view nearby issues and map component markers', async ({ page }) => {
    await loginCitizen(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /priority issues/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /city-wide issue heatmap/i })).toBeVisible();
    await expect(page.getByTitle(/intensity/i).first()).toBeVisible();

    await page.getByRole('link', { name: /browse issues/i }).first().click();
    await expect(page).toHaveURL(/\/issues$/);
    await expect(page.getByRole('heading', { name: /community issues/i })).toBeVisible();
  });

  test('citizen can open issue details from list view', async ({ page }) => {
    await loginCitizen(page);

    await page.goto('/issues', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: /view/i }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /description/i })).toBeVisible();
  });
});
