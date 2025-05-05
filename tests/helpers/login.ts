// tests/helpers/login.ts
import { Page, expect } from '@playwright/test';

/**
 * Loggt den Test-User über die UI ein und wartet,
 * bis das Dashboard sichtbar ist.
 *
 * ENV-Variablen (optional):
 *   E2E_USER_EMAIL, E2E_USER_PASSWORD
 */
export async function loginUI(page: Page) {
  const email = process.env.E2E_USER_EMAIL ?? 'test.user.e2e@example.com';
  const pw = process.env.E2E_USER_PASSWORD ?? 'topsecret';

  // 1) Login-Seite laden
  await page.goto('/login');

  // 2) Felder über <label> finden und füllen
  await page.getByLabel(/^e-mail$/i).fill(email);
  await page.getByLabel(/^passwort$/i).fill(pw);

  // 3) Absenden
  await page.getByRole('button', { name: /^login$/i }).click();

  // 4) Auf Redirect ODER Dashboard-Root warten (max. 20 s)
  await Promise.race([
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
    page
      .getByTestId('dashboard-root')
      .waitFor({ state: 'visible', timeout: 20_000 }),
  ]);

  // 5) Absicherung: Dashboard-Root wirklich da
  await expect(page.getByTestId('dashboard-root')).toBeVisible({
    timeout: 5_000,
  });
}
