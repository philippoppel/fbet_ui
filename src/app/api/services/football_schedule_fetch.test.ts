import { vi, describe, it, expect, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

const matches = [
  {
    matchID: 1,
    matchDateTimeUTC: '2023-01-10T12:00:00Z',
    matchIsFinished: true,
    matchResults: [
      { resultName: 'Endergebnis', pointsTeam1: 2, pointsTeam2: 1 },
    ],
    team1: { teamName: 'A' },
    team2: { teamName: 'B' },
  },
  {
    matchID: 2,
    matchDateTimeUTC: '2023-02-10T12:00:00Z',
    matchIsFinished: false,
    team1: { teamName: 'C' },
    team2: { teamName: 'D' },
  },
];

const { fetchAndParseOpenLigaCompetition } = await import('./football_schedule');
const mockedAxios = axios as unknown as { get: any };

describe('fetchAndParseOpenLigaCompetition', () => {
  afterEach(() => vi.resetAllMocks());

  it('maps and filters matches', async () => {
    mockedAxios.get.mockResolvedValue({ data: matches });
    const from = new Date('2023-01-01T00:00:00Z');
    const to = new Date('2023-01-31T00:00:00Z');
    const events = await fetchAndParseOpenLigaCompetition('bl1', '2023', from, to);
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      matchID: 1,
      homeTeam: 'A',
      awayTeam: 'B',
      result: '2 : 1',
      status: 'FINISHED',
    });
  });
});
