// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'; // Page ist hier nicht explizit nötig, da es über { page } reinkommt
import {
  deleteUserViaApi,
  getJwtFromLocalStorage,
  getUserIdFromJwt,
} from '../helpers/apiHelper';
import { AuthPage } from '../poms/AuthPage';
import { DashboardPage } from '../poms/DashboardPage';

// Hilfsfunktion zum Generieren einzigartiger Benutzerdaten (bleibt gleich)
const generateUniqueUserCredentials = () => {
  const timestamp = Date.now();
  return {
    name: `TestUser${timestamp}`,
    email: `testuser${timestamp}@example.com`,
    password: 'SecurePassword123!',
  };
};

test.describe('Benutzerauthentifizierung mit API Cleanup', () => {
  let userData: ReturnType<typeof generateUniqueUserCredentials>;
  let userToken: string | null = null;
  let userIdForCleanup: string | null = null;

  test.beforeEach(async () => {
    userData = generateUniqueUserCredentials();
    userToken = null;
    userIdForCleanup = null;
    console.log(`[BEFORE EACH] User für Test initialisiert: ${userData.email}`);
  });

  test.afterEach(async ({ page }) => {
    if (userToken) {
      console.log(
        `[AFTER EACH] Token vorhanden für ${userData.email}. Versuche API-Löschung für User-ID: ${userIdForCleanup}.`
      );
      await deleteUserViaApi(
        page,
        userToken,
        userIdForCleanup !== null ? userIdForCleanup : undefined
      );
    } else {
      console.warn(
        `[AFTER EACH] KEIN Token für ${userData.email} vorhanden. API-Löschung übersprungen. User bleibt möglicherweise in DB!`
      );
    }
  });

  test('Sollte einem neuen Benutzer die Registrierung ermöglichen und ihn zum Dashboard leiten', async ({
    page,
  }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    console.log(`[REG-TEST] Starte Registrierung für: ${userData.email}`);
    await authPage.navigateToRegisterPage();
    await authPage.registerUser(
      userData.name,
      userData.email,
      userData.password
    );
    console.log(
      `[REG-TEST] authPage.registerUser() abgeschlossen für ${userData.email}.`
    );

    console.log(
      `[REG-TEST] Warte auf dashboardPage.expectToBeOnDashboard() für ${userData.email}.`
    );
    await dashboardPage.expectToBeOnDashboard(userData.name);
    console.log(
      `[REG-TEST] dashboardPage.expectToBeOnDashboard() erfolgreich für ${userData.email}.`
    );

    // Explizit auf das Token warten, falls es asynchron gesetzt wird
    try {
      console.log(
        `[REG-TEST] Versuche, auf localStorage Key 'fbet_token' zu warten für ${userData.email} (max 5s).`
      );
      await page.waitForFunction(
        () => localStorage.getItem('fbet_token'),
        null,
        { timeout: 5000 }
      );
      console.log(
        `[REG-TEST] localStorage Key 'fbet_token' wurde gefunden (oder Timeout für Warten erreicht) für ${userData.email}.`
      );
    } catch (e) {
      console.error(
        `[REG-TEST] FEHLER oder Timeout beim Warten auf localStorage Key 'fbet_token' für ${userData.email}.`,
        e
      );
    }

    userToken = await getJwtFromLocalStorage(page);
    const cookies = await page.context().cookies();
    const fbetCookie = cookies.find((c) => c.name === 'fbet_token');

    console.log(
      `[REG-TEST] Prüfung für ${userData.email} - LocalStorage 'fbet_token':`,
      userToken
    );
    console.log(
      `[REG-TEST] Prüfung für ${userData.email} - Cookie 'fbet_token':`,
      fbetCookie
        ? { value: fbetCookie.value, expires: fbetCookie.expires }
        : 'nicht gefunden'
    );

    expect(
      userToken,
      `REG-TEST: JWT Token sollte nach Registrierung und Dashboard-Anzeige im LocalStorage sein für ${userData.email}.`
    ).toBeTruthy();

    if (userToken) {
      userIdForCleanup = getUserIdFromJwt(userToken);
      console.log(
        `[REG-TEST] Token für ${userData.email} erfolgreich geholt. UserID für Cleanup: ${userIdForCleanup}`
      );
    }
  });

  test('Sollte einem registrierten Benutzer das Einloggen und Ausloggen ermöglichen', async ({
    page,
  }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    console.log(
      `[LOGIN-TEST] Schritt 1: Registriere Testbenutzer ${userData.email}`
    );
    await authPage.navigateToRegisterPage();
    await authPage.registerUser(
      userData.name,
      userData.email,
      userData.password
    );
    console.log(
      `[LOGIN-TEST] Testbenutzer ${userData.email} für Login-Test registriert.`
    );

    // Token nach initialer Registrierung sichern, falls die App direkt einloggt
    // und dieses Token für den Cleanup relevant ist, falls der spätere Login-Prozess fehlschlägt
    // oder flushToken durch getCurrentUser ausgelöst wird.
    let initialTokenCheck = await getJwtFromLocalStorage(page);
    if (initialTokenCheck) {
      userToken = initialTokenCheck; // Für afterEach sichern, falls der Rest fehlschlägt
      userIdForCleanup = getUserIdFromJwt(userToken);
      console.log(
        `[LOGIN-TEST] Token nach initialer Registrierung von ${userData.email} im LS gefunden. UserID für Cleanup: ${userIdForCleanup}`
      );
    } else {
      console.log(
        `[LOGIN-TEST] KEIN Token nach initialer Registrierung von ${userData.email} im LS gefunden.`
      );
    }

    console.log(
      `[LOGIN-TEST] Schritt 2: Ggf. ausloggen für ${userData.email}, falls nach Registrierung eingeloggt.`
    );
    if (await dashboardPage.logoutButton.isVisible({ timeout: 5000 })) {
      console.log(
        `[LOGIN-TEST] Logout-Button sichtbar, führe Logout für ${userData.email} aus.`
      );
      await dashboardPage.logout();
      console.log(
        `[LOGIN-TEST] Logout nach Registrierung für ${userData.email} abgeschlossen.`
      );
    } else {
      console.log(
        `[LOGIN-TEST] Logout-Button nicht sichtbar für ${userData.email}, kein expliziter Logout nötig.`
      );
    }

    console.log(
      `[LOGIN-TEST] Schritt 3: Versuche Login für ${userData.email}.`
    );
    await authPage.loginUser(userData.email, userData.password);
    console.log(
      `[LOGIN-TEST] authPage.loginUser() abgeschlossen für ${userData.email}.`
    );

    console.log(
      `[LOGIN-TEST] Warte auf dashboardPage.expectToBeOnDashboard() für ${userData.email}.`
    );
    await dashboardPage.expectToBeOnDashboard(userData.name);
    console.log(
      `[LOGIN-TEST] dashboardPage.expectToBeOnDashboard() erfolgreich für ${userData.email}.`
    );

    try {
      console.log(
        `[LOGIN-TEST] Versuche, auf localStorage Key 'fbet_token' zu warten für ${userData.email} (max 5s).`
      );
      await page.waitForFunction(
        () => localStorage.getItem('fbet_token'),
        null,
        { timeout: 5000 }
      );
      console.log(
        `[LOGIN-TEST] localStorage Key 'fbet_token' wurde gefunden (oder Timeout für Warten erreicht) für ${userData.email}.`
      );
    } catch (e) {
      console.error(
        `[LOGIN-TEST] FEHLER oder Timeout beim Warten auf localStorage Key 'fbet_token' für ${userData.email}.`,
        e
      );
    }

    userToken = await getJwtFromLocalStorage(page); // Token erneut holen, da es nach Login neu gesetzt sein sollte
    const cookiesAfterLogin = await page.context().cookies();
    const fbetCookieAfterLogin = cookiesAfterLogin.find(
      (c) => c.name === 'fbet_token'
    );

    console.log(
      `[LOGIN-TEST] Prüfung für ${userData.email} - LocalStorage 'fbet_token':`,
      userToken
    );
    console.log(
      `[LOGIN-TEST] Prüfung für ${userData.email} - Cookie 'fbet_token':`,
      fbetCookieAfterLogin
        ? {
            value: fbetCookieAfterLogin.value,
            expires: fbetCookieAfterLogin.expires,
          }
        : 'nicht gefunden'
    );

    expect(
      userToken,
      `LOGIN-TEST: JWT Token sollte nach Login und Dashboard-Anzeige im LocalStorage sein für ${userData.email}.`
    ).toBeTruthy();

    if (userToken) {
      // userIdForCleanup könnte schon vom initialen Token gesetzt sein, hier ggf. aktualisieren
      userIdForCleanup = getUserIdFromJwt(userToken);
      console.log(
        `[LOGIN-TEST] Token für ${userData.email} erfolgreich geholt. UserID für Cleanup: ${userIdForCleanup}`
      );
    }

    console.log(`[LOGIN-TEST] Schritt 5: Ausloggen für ${userData.email}.`);
    await dashboardPage.logout();
    console.log(`[LOGIN-TEST] Logout für ${userData.email} abgeschlossen.`);

    const tokenAfterLogout = await getJwtFromLocalStorage(page);
    expect(
      tokenAfterLogout,
      `LOGIN-TEST: JWT Token sollte nach dem Logout nicht mehr im LocalStorage sein für ${userData.email}.`
    ).toBeFalsy();
    console.log(
      `[LOGIN-TEST] Token-Prüfung nach Logout für ${userData.email} erfolgreich (sollte null/falsy sein):`,
      tokenAfterLogout
    );
  });
});
