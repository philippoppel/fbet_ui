import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator(
      'text=Wetten unter Freunden – auf alles, was Spaß macht.'
    );
    this.loginButton = page.getByRole('button', { name: /Einloggen/i });
    this.registerButton = page.getByRole('button', {
      name: /Eigene Gruppe starten/i,
    });
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectHeroVisible() {
    await expect(this.heroTitle).toBeVisible();
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async clickRegister() {
    await this.registerButton.click();
  }
}
