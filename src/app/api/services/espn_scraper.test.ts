import { vi, describe, it, expect, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const html = `
  <h2>Key Dates</h2>
  <ul>
    <li>Sept. 12: Las Vegas (ESPN) -- Title Fight</li>
    <li>Oct. 5: New York (DAZN) -- Another Fight</li>
  </ul>
`;

const { fetchAndParseBoxingSchedule } = await import('./espn_scraper');

const mockedAxios = axios as unknown as { get: any };

describe('fetchAndParseBoxingSchedule', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('parses boxing events from ESPN schedule', async () => {
    mockedAxios.get.mockResolvedValue({ data: html });
    const events = await fetchAndParseBoxingSchedule();
    expect(mockedAxios.get).toHaveBeenCalled();
    expect(events.length).toBe(2);
    expect(events[0]).toMatchObject({
      date: 'Sept. 12',
      location: 'Las Vegas',
      broadcaster: 'ESPN',
      details: 'Title Fight',
    });
    expect(events[0].parsedDate).toMatch(/^\d{4}-/);
  });

  it('returns empty array on http error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('fail'));
    await expect(fetchAndParseBoxingSchedule()).rejects.toThrow();
  });
});
