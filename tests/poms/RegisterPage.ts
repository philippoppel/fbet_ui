// tests/poms/RegisterPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly createAccountButton: Locator;
  readonly loginLink: Locator; // Link zur Login-Seite

  constructor(page: Page) {
    this.page = page;
    // Selektoren anpassen, falls deine Labels/Roles anders sind!
    this.nameInput = page.getByRole('textbox', { name: 'Name (Optional)' });
    this.emailInput = page.getByRole('textbox', { name: 'E-Mail' });
    this.passwordInput = page.getByRole('textbox', {
      name: 'Passwort',
      exact: true,
    });
    this.confirmPasswordInput = page.getByRole('textbox', {
      name: 'Passwort bestätigen',
    });
    this.createAccountButton = page.getByRole('button', {
      name: 'Konto erstellen',
    });
    this.loginLink = page.getByRole('link', {
      name: 'Bereits ein Konto? Anmelden',
    }); // Beispieltext
  }

  async navigate() {
    await this.page.goto('/'); // Oder direkter Pfad zur Registrierung, z.B. /register
    // Annahme: Ein Klick ist nötig, um zum Formular zu gelangen
    await this.page
      .getByRole('button', { name: 'Einloggen & Mitwetten' })
      .click();
    await this.page.getByRole('link', { name: 'Konto erstellen' }).click(); // Klick zum Registrierformular
    await expect(this.createAccountButton).toBeVisible(); // Warten bis Seite geladen ist
  }

  async register(
    name: string,
    email: string,
    pass: string,
    confirmPass?: string
  ) {
    if (name) await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.confirmPasswordInput.fill(confirmPass || pass); // Nutze confirmPass oder pass
    await this.createAccountButton.click();
  }

  async expectRegistrationSuccess() {
    // Erwarte eine Weiterleitung zur Login-Seite oder eine Erfolgsmeldung
    // Hier wird angenommen, dass nach erfolgreicher Registrierung das Login-Email-Feld sichtbar wird
    await expect(
      this.page.getByRole('textbox', { name: 'name@example.com' })
    ).toBeVisible({ timeout: 15000 });
    // ODER: await expect(this.page.getByText('Registrierung erfolgreich!')).toBeVisible();
  }

  async expectErrorMessage(message: string | RegExp) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
