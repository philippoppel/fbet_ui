// tests/register.spec.ts
import { test, expect, Locator, Route, Request } from '@playwright/test';
import { fillStable } from './helpers/fillStable';

test.describe('Register-Seite', () => {
  /* ---------------- Test 1: leere Felder ---------------- */
  test('zeigt Validierungsfehler bei leeren Feldern', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /^konto erstellen$/i }).click();
    await expect(
      page.getByText(/bitte gib eine gültige e-mail ein\./i)
    ).toBeVisible();
    await expect(
      page.getByText(/passwort muss mindestens 8 zeichen lang sein\./i)
    ).toBeVisible();
  });

  /* ------------- Test 2: Passwörter unterschiedlich ------------- */
  test('warnt, wenn Passwörter nicht übereinstimmen', async ({ page }) => {
    await page.goto('/register');
    await fillStable(page.getByLabel(/^e-mail$/i), 'user@example.com');
    await fillStable(page.getByLabel(/^passwort$/i), 'Secret123');
    await fillStable(page.getByLabel(/^passwort bestätigen$/i), 'Other123');
    await page.getByRole('button', { name: /^konto erstellen$/i }).click();
    await expect(
      page.getByText(/passwörter stimmen nicht überein\./i)
    ).toBeVisible();
  });

  /* ------------- Test 3: Backend-Fehler (400) ------------- */
  test('zeigt Backend-Fehler „E-Mail bereits registriert“', async ({
    page,
  }) => {
    const routePath = '**/users/';

    await page.route(routePath, async (route: Route, request: Request) => {
      request.method() === 'POST'
        ? await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Email already registered' }),
          })
        : await route.continue();
    });

    await page.goto('/register');
    await fillStable(page.getByLabel(/^e-mail$/i), 'existing@example.com');
    await fillStable(page.getByLabel(/^passwort$/i), 'Secret123');
    await fillStable(page.getByLabel(/^passwort bestätigen$/i), 'Secret123');
    await page.getByRole('button', { name: /^konto erstellen$/i }).click();

    await expect(page.getByText(/registrierung fehlgeschlagen/i)).toBeVisible();
    await expect(page.getByText(/email already registered/i)).toBeVisible();
    await expect(page).toHaveURL(/.*register/);
  });

  /* -------- Test 4: erfolgreiche Registrierung (201) -------- */
  test('registriert erfolgreich und leitet auf /login weiter', async ({
    page,
  }) => {
    const routePath = '**/users/';

    await page.route(routePath, async (route: Route, request: Request) => {
      request.method() === 'POST'
        ? await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 1,
              email: 'new@example.com',
              name: 'New User',
              is_active: true,
            }),
          })
        : await route.continue();
    });

    await page.goto('/register');
    await fillStable(page.getByLabel(/^e-mail$/i), 'new@example.com');
    await fillStable(page.getByLabel(/^passwort$/i), 'Secret123');
    await fillStable(page.getByLabel(/^passwort bestätigen$/i), 'Secret123');
    await page.getByRole('button', { name: /^konto erstellen$/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByText(/registrierung erfolgreich!/i)).toBeVisible();
  });
});
