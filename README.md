# fbet – Wetten unter Freunden

fbet ist eine Webanwendung zum Erstellen privater Tippgruppen. Ihr könnt Events festlegen, Freunde einladen und gemeinsam wetten – ob auf Sportereignisse, Serienfinalen oder den nächsten Crypto-Hype. Das Projekt basiert auf [Next.js](https://nextjs.org/) mit TypeScript, Prisma und Tailwind CSS und lässt sich als Progressive Web App (PWA) installieren.

## Features

- Registrierung und Login über JWT-Authentifizierung
- Verwaltung von Gruppen mit Einladungslinks
- Events anlegen, Tipps abgeben und Highscores einsehen
- Kommentarfunktion mit GIF-Unterstützung
- Push-Benachrichtigungen (optional)
- Mobile App mittels Capacitor

## Quickstart

1. **Repository klonen und Abhängigkeiten installieren**
   ```bash
   npm install
   ```
2. **Umgebungsvariablen anlegen**
   Erstelle eine `.env`-Datei im Projektverzeichnis und fülle mindestens folgende Werte:
   ```env
   DATABASE_URL=postgres://user:pass@localhost:5432/fbet
   NEXT_PUBLIC_API_BASE_URL=
   NEXT_PUBLIC_GIPHY_API_KEY=dein_giphy_key
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=dein_vapid_public_key
   VAPID_PUBLIC_KEY=dein_vapid_public_key
   VAPID_PRIVATE_KEY=dein_vapid_private_key
   VAPID_SUBJECT=mailto:you@example.com
   ```
   Für die End-to-End-Tests können optional `E2E_USER_EMAIL` und `E2E_USER_PASSWORD` gesetzt werden.
3. **Datenbank vorbereiten**
   ```bash
   npx prisma migrate dev
   ```
4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Anschließend ist die Anwendung unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Tests

- Unit-Tests mit [Vitest](https://vitest.dev):
  ```bash
  npm test
  ```
- End-to-End-Tests mit [Playwright](https://playwright.dev):
  ```bash
  npm run test:e2e
  ```

Alle Tests werden zudem automatisch in GitHub Actions ausgeführt, sowohl bei Pull
Requests als auch nach einem Push auf den `main`-Branch. Nur wenn diese Tests
erfolgreich sind, kann der Code gemergt werden.

## Produktion

Für den Build werden automatisch Prisma-Client generiert und Migrations ausgeführt:

```bash
npm run build
npm start
```

## Lizenz

Dieses Repository enthält derzeit keine offizielle Lizenzdatei. Falls du den Code verwenden möchtest, stimme dich bitte mit dem Autor ab.
