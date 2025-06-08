// tests/auth/register.spec.ts
import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test('Register API creates a new user and allows login', async ({
  request,
}) => {
  // Dummy-Daten → unique machen (damit der Test immer geht!)
  const randomSuffix = Math.floor(Math.random() * 100000);
  const testEmail = `testuser_${randomSuffix}@example.com`;
  const testPassword = 'testpassword123';
  const testName = 'Test User';

  // Schritt 1: Registrierung
  const registerResponse = await request.post(
    `${API_BASE_URL}/api/auth/register`,
    {
      data: {
        email: testEmail,
        name: testName,
        password: testPassword,
      },
    }
  );

  expect(registerResponse.status()).toBe(201);

  const createdUser = await registerResponse.json();
  expect(createdUser).toHaveProperty('email', testEmail);
  expect(createdUser).toHaveProperty('isActive', true);

  // Schritt 2: Login mit neuen Userdaten
  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: {
      email: testEmail,
      password: testPassword,
    },
  });

  expect(loginResponse.status()).toBe(200);

  const loginBody = await loginResponse.json();
  expect(loginBody).toHaveProperty('access_token');
  expect(loginBody).toHaveProperty('user.email', testEmail);
});
