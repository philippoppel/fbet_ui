// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('LandingPage should show main headline', async ({ page }) => {
  await page.goto('/');

  // Prüfen ob der große Slogan sichtbar ist
  await expect(
    page.getByRole('heading', { name: /wetten unter freunden/i })
  ).toBeVisible();
});
