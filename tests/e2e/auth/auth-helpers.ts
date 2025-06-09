// tests/auth/auth-helpers.ts
import { APIRequestContext, request } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

/**
 * Führt API-Login durch und gibt access_token zurück
 */
export async function loginViaApi(
  email: string,
  password: string
): Promise<string> {
  const apiContext = await request.newContext();

  const response = await apiContext.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password },
  });

  if (response.status() !== 200) {
    throw new Error(
      `Login fehlgeschlagen: ${response.status()} - ${await response.text()}`
    );
  }

  const body = await response.json();
  return body.access_token;
}
