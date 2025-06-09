import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_USER_EMAIL || 'testuser@example.com';
const PASSWORD = process.env.E2E_USER_PASSWORD || 'testpassword123';

test('user can log in via UI and reach dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('name@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 10000 }),
    page.getByRole('button', { name: 'Anmelden' }).click(),
  ]);
  await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible();
});
