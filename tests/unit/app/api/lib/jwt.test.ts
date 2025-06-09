import { signJwt, verifyJwt } from '@/app/api/lib/jwt';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';

describe('jwt helpers', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV, SECRET_KEY: 'testsecret', ACCESS_TOKEN_EXPIRE_DAYS: '1d' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('signs and verifies a token', () => {
    const token = signJwt({ sub: 1 });
    const decoded = verifyJwt(token);
    expect(decoded?.sub).toBe('1');
  });

  it('returns null for invalid token', () => {
    const bad = verifyJwt('bad.token');
    expect(bad).toBeNull();
  });
});
