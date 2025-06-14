import { test } from '@playwright/test';
import { HomePage } from './pageObjects/HomePage';

test('homepage displays hero text', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.expectHeroVisible();
});
