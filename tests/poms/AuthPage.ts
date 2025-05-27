// pages/AuthPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;

  // Gemeinsame Elemente
  readonly initialLoginOrRegisterButton: Locator;

  // Registrierung
  readonly goToRegisterLink: Locator;
  readonly nameInput: Locator;
  readonly emailInputRegister: Locator;
  readonly passwordInputRegister: Locator;
  readonly confirmPasswordInput: Locator;
  readonly createAccountButton: Locator;

  // Login
  readonly emailInputLogin: Locator; // Annahme: Name-Attribut oder Placeholder
  readonly passwordInputLogin: Locator; // Annahme: Name-Attribut oder Placeholder
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.initialLoginOrRegisterButton = page.getByRole('button', {
      name: 'Einloggen & Mitwetten',
    });

    // Registrierung
    this.goToRegisterLink = page.getByRole('link', { name: 'Konto erstellen' });
    this.nameInput = page.getByRole('textbox', { name: 'Name (Optional)' });
    this.emailInputRegister = page.getByRole('textbox', { name: 'E-Mail' });
    this.passwordInputRegister = page.getByRole('textbox', {
      name: 'Passwort',
      exact: true,
    });
    this.confirmPasswordInput = page.getByRole('textbox', {
      name: 'Passwort bestätigen',
    });
    this.createAccountButton = page.getByRole('button', {
      name: 'Konto erstellen',
    });

    // Login (Selektoren anpassen, falls nötig!)
    this.emailInputLogin = page.getByRole('textbox', {
      name: 'name@example.com',
    }); // Ggf. anpassen!
    this.passwordInputLogin = page.getByRole('textbox', { name: '••••••••' }); // Ggf. anpassen!
    this.loginButton = page.getByRole('button', { name: 'Anmelden' });
  }

  async navigateToRegisterPage() {
    await this.page.goto('/');
    await this.initialLoginOrRegisterButton.click();
    await this.goToRegisterLink.click();
    await expect(this.createAccountButton).toBeVisible();
  }

  async registerUser(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInputRegister.fill(email);
    await this.passwordInputRegister.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.createAccountButton.click();
    // Warte auf Navigation oder ein eindeutiges Zeichen, dass die Registrierung UI-seitig abgeschlossen ist.
    // Oft ist das eine Weiterleitung zum Dashboard oder zur Login-Seite.
    // Beispiel: await this.page.waitForURL(/dashboard|login/);
  }

  async navigateToLoginPage() {
    await this.page.goto('/');
    await this.initialLoginOrRegisterButton.click();
    await expect(this.loginButton).toBeVisible();
  }

  async loginUser(email: string, password: string) {
    // Stelle sicher, dass das Login-Formular sichtbar ist, falls nicht schon da.
    if (!(await this.loginButton.isVisible({ timeout: 5000 }))) {
      // Kurzer Timeout für die Prüfung
      await this.navigateToLoginPage();
    }
    await this.emailInputLogin.fill(email);
    await this.passwordInputLogin.fill(password);
    await this.loginButton.click();
    // Warte auf Navigation oder ein eindeutiges Zeichen des Erfolgs, z.B. URL-Änderung
    // await this.page.waitForURL('**/dashboard'); // Beispiel
  }
}
