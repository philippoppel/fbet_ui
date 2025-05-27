// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Lade Umgebungsvariablen aus .env Datei
dotenv.config();

// Bestimme, ob Tests Headless laufen sollen (Standard: ja)
const HEADLESS = process.env.HEADLESS !== 'false';
// Bestimme die Anzahl der Worker (falls in Umgebungsvariable gesetzt)
const WORKERS = process.env.PW_WORKERS
  ? Number(process.env.PW_WORKERS)
  : undefined; // Standard: Playwright entscheidet

export default defineConfig({
  // Verzeichnis, in dem sich die Testdateien befinden
  testDir: './tests',
  // Globales Timeout für jeden einzelnen Test
  timeout: 30_000, // 30 Sekunden

  // Globale Erwartungs-Einstellungen (z.B. default timeout für expect)
  expect: {
    timeout: 5000, // 5 Sekunden Standard-Timeout für expect()-Assertions
  },

  // Ob Tests innerhalb einer Datei parallel ausgeführt werden sollen
  fullyParallel: true,
  // Verhindere das versehentliche Einchecken von test.only in CI-Umgebungen
  forbidOnly: !!process.env.CI,
  // Anzahl der Wiederholungsversuche bei fehlgeschlagenen Tests
  // WICHTIG: Für lokales Debugging ist 0 oft besser, um den Fehler sofort zu sehen.
  // In CI-Umgebungen sind 1 oder 2 Wiederholungen üblich.
  retries: process.env.CI ? 2 : 0,
  // Anzahl der Worker (parallele Testausführungen)
  workers: WORKERS, // undefined lässt Playwright entscheiden (oft CPU-Kerne - 1)

  // Reporter für die Testergebnisse (Konsole und HTML-Report)
  reporter: [
    ['dot'], // Zeigt einen Punkt für jeden Test in der Konsole
    ['html', { open: 'never' }], // Erstellt einen HTML-Report (nicht automatisch öffnen)
  ],

  // Globale Einstellungen, die für alle Projekte gelten
  use: {
    // Basis-URL für Aktionen wie page.goto('/')
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    // Ob der Browser ohne sichtbares Fenster gestartet wird
    headless: HEADLESS,
    // Standard-Viewport-Größe
    viewport: { width: 1280, height: 800 },

    /* --- Trace-Einstellungen für Debugging --- */
    // Erstellt einen Trace, aber behält ihn nur, wenn der Test fehlschlägt.
    // Ideal, um Fehler nachträglich zu analysieren.
    trace: 'retain-on-failure',
    // Alternativ: 'on' (immer erstellen), 'off' (nie), 'on-first-retry' (nur bei Retry)

    // Screenshot-Einstellungen
    screenshot: 'only-on-failure', // Macht nur einen Screenshot, wenn der Test fehlschlägt
    // Video-Aufnahme-Einstellungen
    video: 'retain-on-failure', // Nimmt ein Video auf, behält es nur bei Fehlschlag
  },

  // Konfiguration für verschiedene Browser/Geräte
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Verwende die installierte stabile Chrome-Version
      },
    },
    {
      name: 'iphone',
      use: {
        ...devices['iPhone 15 Pro'], // Simuliere ein iPhone 15 Pro
        locale: 'de-DE', // Setze die Sprache/Region
      },
    },
    // Beispiel für weitere Projekte (auskommentiert)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Verzeichnis für Testergebnisse (Screenshots, Videos, Traces, HTML-Report)
  outputDir: 'test-results/',

  /* Optional: Web server configuration */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
