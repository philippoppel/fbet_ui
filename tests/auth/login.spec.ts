import { test, expect } from '@playwright/test';
import fs from 'fs';

const token = JSON.parse(
  fs.readFileSync('./tests/.auth-token.json', 'utf-8')
).token;

test('Authorized /me returns user', async ({ request }) => {
  const meResponse = await request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(meResponse.status()).toBe(200);

  const user = await meResponse.json();
  expect(user.email).toBe('testuser@example.com');
});
