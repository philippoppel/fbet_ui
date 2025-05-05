// tests/global-setup.ts
import { request as pwRequest } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config(); // .env laden

export default async function globalSetup() {
  console.log('\n--- Starting Global E2E Setup ---');

  /* ---------- Konfiguration aus ENV ------------------------ */
  const apiBase = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
  const email = process.env.E2E_USER_EMAIL;
  const pw = process.env.E2E_USER_PASSWORD;

  if (!email || !pw) {
    throw new Error(
      'Bitte E2E_USER_EMAIL und E2E_USER_PASSWORD in der Umgebung setzen (.env).'
    );
  }

  const api = await pwRequest.newContext(); // Playwright-API-Client

  /* ---------- 1. Login-Versuch ----------------------------- */
  const loginRes = await api.post(`${apiBase}/users/login`, {
    form: { username: email, password: pw },
  });

  if (loginRes.ok()) {
    console.log('✅ Test-User existiert & Passwort stimmt.');
    console.log('--- Global E2E Setup Finished ---\n');
    return;
  }

  console.log(
    `ℹ️ Login schlug fehl (${loginRes.status()}). Versuche, User anzulegen …`
  );

  /* ---------- 2. Registrierung ----------------------------- */
  const regRes = await api.post(`${apiBase}/users/`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, name: 'E2E Bot', password: pw },
  });

  if (regRes.status() === 201) {
    console.log(`✅ Test-User ${email} neu angelegt.`);
    console.log('--- Global E2E Setup Finished ---\n');
    return;
  }

  // 400 könnte "Email already registered" bedeuten
  if (regRes.status() === 400) {
    const body = await regRes.json().catch(() => ({}));
    const detail = body?.detail ?? JSON.stringify(body);

    if (typeof detail === 'string' && /already.*registered/i.test(detail)) {
      console.error(
        `❌ User ${email} existiert bereits, aber Passwort im ENV scheint falsch.\n` +
          'Bitte Passwort angleichen oder User aus der DB löschen.'
      );
    } else {
      console.error('❌ Registrierung schlug mit 400 fehl:', detail);
    }
  } else {
    console.error(
      `❌ Unerwartete Antwort bei Registrierung: ${regRes.status()} – ${await regRes.text()}`
    );
  }

  console.log('--- Global E2E Setup Aborted ---\n');
  throw new Error('Global setup failed – Tests werden abgebrochen.');
}
