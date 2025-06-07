// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { loginUI } from './helpers/login';
import { fillStable } from './helpers/fillStable';

test.describe('Login-Seite', () => {
  test('zeigt Validierungsfehler bei leeren Feldern', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /anmelden/i }).click();

    await expect(page.getByText(/gültige e.?mail an/i)).toBeVisible();
    await expect(page.getByText(/bitte passwort eingeben/i)).toBeVisible();
  });

  test('zeigt Fehlermeldung bei falschen Credentials', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' }),
      })
    );

    await page.goto('/login');
    await fillStable(page.getByPlaceholder('name@example.com'), 'wrong@example.com');
    await fillStable(page.getByPlaceholder('••••••••'), 'wrongpw');
    await page.getByRole('button', { name: /anmelden/i }).click();

    await expect(page.getByText(/login fehlgeschlagen/i)).toBeVisible();
  });

  test('loggt erfolgreich ein und landet im Dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fbet_token', 'fake-token');
    });
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, email: 'tester@example.com', name: 'Test User' }),
      })
    );

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });
});
