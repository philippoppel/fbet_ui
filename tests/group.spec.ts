import { test, expect, Locator, Route, Request } from '@playwright/test';
import { loginUI } from './helpers/login';
import { fillStable } from './helpers/fillStable';

/* ---------- Fake-Antworten ---------- */
const fakeUser = {
  id: 1,
  email: 'tester@example.com',
  name: 'Test-User',
  is_active: true,
};
const fakeToken = { access_token: 'fake-token', token_type: 'bearer' };

test.describe('CreateGroup-Seite (nach Login)', () => {
  /* ---------- Gemeinsame Mocks & Login ---------- */
  test.beforeEach(async ({ page }) => {
    /* 1) Login-Endpunkt */
    await page.route('**/users/login', async (route: Route, req: Request) => {
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fakeToken),
        });
      } else {
        await route.continue();
      }
    });

    /* 2) /users/me – liefert sofort den User */
    await page.route('**/users/me', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeUser),
      })
    );

    /* 3) GET-Aufrufe, die das Layout ausführt (nie 401!) */
    await page.route('**/groups/', async (route, req) => {
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });
    await page.route('**/memberships/**', async (route, req) => {
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    /* 4) UI-Login – redirectet auf /dashboard  */
    await loginUI(page);
  });

  /* ---------- Test 1: leeres Submit ---------- */
  test('zeigt Validierungsfehler bei leerem Submit', async ({ page }) => {
    await page.goto('/groups/create');
    await page.getByRole('button', { name: /^gruppe erstellen$/i }).click();
    await expect(
      page.getByText(/gruppenname muss mindestens 3 zeichen lang sein\./i)
    ).toBeVisible();
  });

  /* ---------- Test 2: Name zu kurz ---------- */
  test('warnt, wenn der Gruppenname zu kurz ist', async ({ page }) => {
    await page.goto('/groups/create');
    await fillStable(page.getByLabel(/^gruppenname$/i), 'Hi');
    await page.getByRole('button', { name: /^gruppe erstellen$/i }).click();
    await expect(
      page.getByText(/gruppenname muss mindestens 3 zeichen lang sein\./i)
    ).toBeVisible();
  });

  /* ---------- Test 3: Backend-Fehler 400 ---------- */
  test('zeigt Backend-Fehler „Name bereits vergeben“', async ({ page }) => {
    /* POST-Mock für genau diesen Test */
    await page.route('**/groups/', async (route, req) => {
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Group name already exists' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/groups/create');
    await fillStable(page.getByLabel(/^gruppenname$/i), 'Beste Gruppe');
    await fillStable(page.getByLabel(/^beschreibung/i), 'Nur für Freunde');
    await page.getByRole('button', { name: /^gruppe erstellen$/i }).click();

    await expect(page.getByText(/group name already exists/i)).toBeVisible();
    await expect(page).toHaveURL(/\/groups\/create/); // bleibt auf Seite
  });

  /* ---------- Test 4: Erfolg & Redirect ---------- */
  test('erstellt erfolgreich und leitet auf /dashboard weiter', async ({
    page,
  }) => {
    await page.route('**/groups/', async (route, req) => {
      if (req.method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 42,
            name: 'Tipprunde 2026',
            description: 'WM-Tipps',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/groups/create');
    await fillStable(page.getByLabel(/^gruppenname$/i), 'Tipprunde 2026');
    await fillStable(page.getByLabel(/^beschreibung/i), 'WM-Tipps');

    const submit = page.getByRole('button', { name: /^gruppe erstellen$/i });
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 15_000 }),
      submit.click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/gruppe erfolgreich erstellt!/i)).toBeVisible();
  });
});
