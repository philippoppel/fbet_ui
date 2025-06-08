import { test, expect } from '@playwright/test';
import fs from 'fs';

const API_BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const token = JSON.parse(fs.readFileSync('./tests/.auth-token.json', 'utf-8')).token;

// Helper to send authorized requests
const authHeaders = { Authorization: `Bearer ${token}` };

test('complete betting workflow', async ({ request }) => {
  // 1. create group
  const groupRes = await request.post('/api/groups', {
    data: { name: 'E2E Group', description: 'workflow' },
    headers: authHeaders,
  });
  expect(groupRes.status()).toBe(201);
  const group = await groupRes.json();
  const groupId = group.id as number;

  // 3. create event
  const eventRes = await request.post('/api/events', {
    data: {
      group_id: groupId,
      title: 'Test Event',
      question: 'Who wins?',
      options: ['A', 'B'],
      has_wildcard: true,
      wildcard_type: 'GENERIC',
      wildcard_prompt: 'Bonus?',
    },
    headers: authHeaders,
  });
  expect(eventRes.status()).toBe(201);
  const event = await eventRes.json();
  const eventId = event.id as number;

  // 4. place tip with wildcard guess
  const tipRes = await request.post('/api/tips', {
    data: {
      event_id: eventId,
      selected_option: 'A',
      wildcard_guess: 'yes',
    },
    headers: authHeaders,
  });
  expect(tipRes.status()).toBe(200);

  // 5. admin sets result
  const resultRes = await request.post('/api/events/result', {
    data: {
      event_id: eventId,
      winning_option: 'A',
      wildcard_answer: 'yes',
    },
    headers: authHeaders,
  });
  expect(resultRes.status()).toBe(200);

  // 6. fetch highscore
  const hsRes = await request.get(`/api/groups/highscore/${groupId}`, {
    headers: authHeaders,
  });
  expect([200, 404]).toContain(hsRes.status());
});
