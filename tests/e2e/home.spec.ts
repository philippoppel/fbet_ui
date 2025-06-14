import { test, expect } from '@playwright/test';

test('homepage displays hero text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Wetten unter Freunden – auf alles, was Spaß macht.')).toBeVisible();
});
