// tests/add-event-dialog.spec.ts
import { test, expect, Page, Route, Request } from '@playwright/test';
import { loginUI } from './helpers/login';
import { fillStable } from './helpers/fillStable';

/* ------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------ */
const fakeUser = { id: 1, email: 'tester@example.com', name: 'Test-User' };
const fakeToken = { access_token: 'fake', token_type: 'bearer' };
const group = { id: 99, name: 'E2E-Gruppe', description: 'Test-Group' };

let eventsData: any[] = [];

/* ------------------------------------------------------------------
 * Helper: Gruppe in der Sidebar anklicken
 * ------------------------------------------------------------------ */
async function openGroup(page: Page) {
  const button = page.getByTestId(`group-btn-${group.id}`);
  const heading = page.getByRole('heading', {
    name: new RegExp(group.name, 'i'),
  });

  // Button muss da sein …
  await expect(button).toBeVisible({ timeout: 15_000 });

  // Klick & gleichzeitig auf URL warten (Router-Navigation)
  await Promise.all([
    page.waitForURL(new RegExp(`/groups/${group.id}`)),
    button.click(),
  ]);

  // Heading sollte danach gerendert sein
  await expect(heading).toBeVisible({ timeout: 7_500 });
}

/* ------------------------------------------------------------------
 * Gemeinsame Routen-Mocks
 * ------------------------------------------------------------------ */
function mockDashboardRoutes(page: Page, eventsData: any[]) {
  /* ---------- Auth ---------- */
  page.route('**/users/login', (r) =>
    r.fulfill({ status: 200, body: JSON.stringify(fakeToken) })
  );
  page.route('**/users/me', (r) =>
    r.fulfill({ status: 200, body: JSON.stringify(fakeUser) })
  );

  /* ---------- Gruppen ---------- */
  const listRe = /\/groups\/?(?:\?.*)?$/;
  const detailRe = new RegExp(`/groups/${group.id}/?(?:\\?.*)?$`);

  page.route(listRe, (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({ status: 200, body: JSON.stringify([group]) })
      : r.continue()
  );

  page.route(detailRe, (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({ status: 200, body: JSON.stringify(group) })
      : r.continue()
  );

  /* ---------- Daten der gewählten Gruppe ---------- */
  const eventsRe = new RegExp(`/groups/${group.id}/events/?(?:\\?.*)?$`);
  const highscoreRe = new RegExp(`/groups/${group.id}/highscore/?(?:\\?.*)?$`);

  page.route(eventsRe, (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(eventsData),
        })
      : r.continue()
  );

  page.route(highscoreRe, (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      : r.continue()
  );

  /* ---------- Generische Events- / Tips-Endpunkte ---------- */
  page.route('**/events/**', (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({ status: 200, body: '[]' })
      : r.continue()
  );
  page.route('**/tips/**', (r, req) =>
    req.method() === 'GET'
      ? r.fulfill({ status: 200, body: '[]' })
      : r.continue()
  );
}

/* ==================================================================
 * Tests
 * ================================================================== */
test.describe('Add-Event-Dialog', () => {
  /* ---------- beforeEach ---------- */
  test.beforeEach(async ({ page }) => {
    eventsData = [];
    mockDashboardRoutes(page, eventsData);
    await loginUI(page); // UI-Login (nutzt die Auth-Mocks)
    await openGroup(page); // Sidebar-Navigation
  });

  /* ---------- 1: Client-Validation ---------- */
  test('zeigt Validierungsfehler', async ({ page }) => {
    const newEventBtn = page.getByRole('button', { name: /neues event/i });
    await expect(newEventBtn).toBeVisible({ timeout: 10_000 });
    await newEventBtn.click();
    await page.getByRole('button', { name: /^event erstellen$/i }).click();

    await expect(page.getByText(/titel.*erforderlich/i)).toBeVisible();
    await expect(page.getByText(/optionen.*mindestens 2/i)).toBeVisible();
  });

  /* ---------- 2: Backend-Fehler (400) ---------- */
  test('zeigt Backend-Fehler »Titel bereits vorhanden«', async ({ page }) => {
    page.route('**/events/', (route, req) => {
      if (req.method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Event title already exists' }),
        });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: /neues event/i }).click();
    await fillStable(page.getByLabel(/^titel$/i), 'Fight Night');
    await fillStable(page.getByLabel(/^frage$/i), 'Wer gewinnt?');
    await fillStable(page.getByLabel(/^optionen$/i), 'A\nB');
    await page.getByRole('button', { name: /^event erstellen$/i }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible(); // Dialog bleibt offen
  });

  /* ---------- 3: Erfolgreiche Erstellung ---------- */
  test('erstellt erfolgreich & schließt Dialog', async ({ page }) => {
    page.route('**/events/', (route, req) => {
      if (req.method() === 'POST') {
        const newEvent = { id: 123, title: 'UFC 300' };
        eventsData.push(newEvent);
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newEvent),
        });
      } else {
        route.continue();
      }
    });

    await page.getByRole('button', { name: /neues event/i }).click();
    await fillStable(page.getByLabel(/^titel$/i), 'UFC 300');
    await fillStable(page.getByLabel(/^frage$/i), 'Wer gewinnt?');
    await fillStable(page.getByLabel(/^optionen$/i), 'A\nB');
    await page.getByRole('button', { name: /^event erstellen$/i }).click();

    await expect(page.getByText(/event erfolgreich erstellt/i)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { name: /UFC 300/i })).toBeVisible();
  });
});
