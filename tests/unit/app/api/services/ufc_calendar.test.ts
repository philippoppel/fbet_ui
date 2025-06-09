import { vi, describe, it, expect, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:1
SUMMARY:UFC 1
LOCATION:Las Vegas
DESCRIPTION:desc
DTSTART:20300101T100000Z
DTEND:20300101T120000Z
END:VEVENT
END:VCALENDAR`;

const { fetchAndParseUfcSchedule } = await import('@/app/api/services/ufc_calendar');

const mockedAxios = axios as unknown as { get: any };

describe('fetchAndParseUfcSchedule', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('parses upcoming UFC events', async () => {
    mockedAxios.get.mockResolvedValue({ data: ics });
    const events = await fetchAndParseUfcSchedule();
    expect(mockedAxios.get).toHaveBeenCalled();
    expect(events[0]).toMatchObject({
      summary: 'UFC 1',
      location: 'Las Vegas',
    });
    expect(events[0].dtstart).toBe('2030-01-01T10:00:00.000Z');
  });

  it('throws on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('fail'));
    await expect(fetchAndParseUfcSchedule()).rejects.toThrow();
  });
});
