import { vi, describe, it, expect, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const matches = [
  {
    matchID: 1,
    matchDateTimeUTC: '2023-01-10T12:00:00Z',
    matchIsFinished: true,
    matchResults: [
      { resultName: 'Endergebnis', pointsTeam1: 3, pointsTeam2: 2 },
    ],
    team1: { teamName: 'A' },
    team2: { teamName: 'B' },
  },
  {
    matchID: 2,
    matchDateTimeUTC: '2023-01-15T12:00:00Z',
    matchIsFinished: false,
    team1: { teamName: 'N/A' },
    team2: { teamName: 'N/A' },
  },
  {
    matchID: 3,
    matchDateTimeUTC: '2023-02-10T12:00:00Z',
    matchIsFinished: false,
    team1: { teamName: 'C' },
    team2: { teamName: 'D' },
  },
];

const { fetchAndParseAustriaMatchesOpenLiga } = await import('@/app/api/services/football_schedule');
const mockedAxios = axios as unknown as { get: any };

describe('fetchAndParseAustriaMatchesOpenLiga', () => {
  afterEach(() => vi.resetAllMocks());

  it('maps and filters matches', async () => {
    mockedAxios.get.mockResolvedValue({ data: matches });
    const from = new Date('2023-01-01T00:00:00Z');
    const to = new Date('2023-01-31T00:00:00Z');
    const events = await fetchAndParseAustriaMatchesOpenLiga('148', from, to);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('148'), expect.any(Object));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      matchID: 1,
      homeTeam: 'A',
      awayTeam: 'B',
      result: '3 : 2',
    });
  });

  it('returns empty array on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('fail'));
    const from = new Date('2023-01-01T00:00:00Z');
    const to = new Date('2023-01-31T00:00:00Z');
    const result = await fetchAndParseAustriaMatchesOpenLiga('148', from, to);
    expect(result).toEqual([]);
  });
});
