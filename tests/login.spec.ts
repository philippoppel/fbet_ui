// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { loginUI } from './helpers/login';
import { fillStable } from './helpers/fillStable';

test.describe('Login-Seite', () => {
  test('zeigt Validierungsfehler bei leeren Feldern', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^login$/i }).click();

    await expect(
      page.getByText(/bitte gib eine gültige e-mail-adresse ein\./i)
    ).toBeVisible();
    await expect(
      page.getByText(/bitte gib dein passwort ein\./i)
    ).toBeVisible();
  });

  test('zeigt Fehlermeldung bei falschen Credentials', async ({ page }) => {
    await page.route('**/users/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      })
    );

    await page.goto('/login');
    await fillStable(page.getByLabel(/^e-mail$/i), 'wrong@example.com');
    await fillStable(page.getByLabel(/^passwort$/i), 'wrongpw');
    await page.getByRole('button', { name: /^login$/i }).click();

    await expect(page.getByText(/login fehlgeschlagen/i)).toBeVisible();
  });

  test('loggt erfolgreich ein und landet im Dashboard', async ({ page }) => {
    await loginUI(page); // loginUI kann intern weiter .fill oder fillStable nutzen
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });
});
