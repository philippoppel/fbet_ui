// utils/apiHelper.ts
import { Page, APIRequestContext } from '@playwright/test';
import { string } from 'zod';
import { token } from 'stylis';

/**
 * Löscht einen Benutzer über den API-Endpunkt.
 * Benötigt einen gültigen JWT des zu löschenden Benutzers.
 * @param page - Die Playwright Page Instanz, um page.request zu nutzen
 * @param token - Das JWT des Benutzers
 * @param userId - Die ID des Benutzers (optional, für Logging oder Verifizierung)
 */
export async function deleteUserViaApi(
  page: Page,
  token: string,
  userId?: number | string
) {
  if (!token) {
    console.warn(
      'Kein Token zum Löschen des Benutzers vorhanden. Überspringe API-Aufruf.'
    );
    return;
  }

  const response = await page.request.delete(`/api/auth/delete-account`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    // Logge einen Fehler, aber lasse den Test nicht unbedingt fehlschlagen,
    // da der Test selbst vielleicht schon fehlgeschlagen ist und dies nur Cleanup ist.
    console.error(
      `Fehler beim Löschen des Benutzers ${userId || ''} via API. Status: ${response.status()}, Body: ${await response.text()}`
    );
  } else {
    console.log(`Benutzer ${userId || ''} erfolgreich via API gelöscht.`);
  }
  return response;
}

/**
 * Ruft das JWT aus dem LocalStorage ab.
 * Der Key 'jwt_token' ist eine Annahme und muss an deine App angepasst werden.
 * @param page - Die Playwright Page Instanz
 * @returns Das JWT oder null, falls nicht gefunden.
 */
export async function getJwtFromLocalStorage(
  page: Page
): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('fbet_token')); // Passe 'jwt_token' ggf. an!
}

/**
 * Extrahiert die User ID aus dem JWT Payload.
 * Dies ist eine vereinfachte Annahme. In der Realität würdest du eine JWT-Decode-Bibliothek verwenden,
 * aber für Testzwecke, wenn du die Struktur kennst, reicht dies oft.
 * ACHTUNG: Nicht für produktiven Code verwenden, da clientseitiges Parsen von JWTs unsicher sein kann.
 * Für Test-Logging/Cleanup ist es aber oft ok.
 * @param token - Das JWT
 * @returns Die User ID (sub) oder null.
 */
export function getUserIdFromJwt(token: string): string | null {
  if (!token) return null;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const decodedPayload = Buffer.from(payloadBase64, 'base64').toString(
      'utf-8'
    );
    const payload = JSON.parse(decodedPayload);
    return payload.sub || null; // 'sub' ist oft die User ID
  } catch (error) {
    console.error('Fehler beim Dekodieren des JWTs im Test:', error);
    return null;
  }
}
