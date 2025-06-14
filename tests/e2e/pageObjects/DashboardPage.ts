import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly loginPrompt: Locator;
  readonly groupDetails: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginPrompt = page.getByTestId('login-prompt-div');
    this.groupDetails = page.getByTestId('group-details');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectLoginPrompt() {
    await expect(this.loginPrompt).toBeVisible();
  }

  async expectGroupDetailsVisible() {
    await expect(this.groupDetails).toBeVisible();
  }
}
