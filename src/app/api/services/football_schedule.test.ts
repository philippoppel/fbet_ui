import { addDays, calculateWeeksBetween } from './football_schedule';
import { describe, it, expect } from 'vitest';

describe('football schedule utilities', () => {
  it('adds days to date', () => {
    const d = new Date('2020-01-01T00:00:00Z');
    const result = addDays(d, 5);
    expect(result.toISOString()).toBe('2020-01-06T00:00:00.000Z');
  });

  it('calculates weeks between dates', () => {
    const from = new Date('2020-01-01T00:00:00Z');
    const to = new Date('2020-01-20T00:00:00Z');
    expect(calculateWeeksBetween(from, to)).toBe(4);
  });
});
