import { hashPassword, verifyPassword } from '@/app/api/lib/hash';
import { describe, it, expect } from 'vitest';

describe('hash helpers', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('secret');
    expect(hash).not.toBe('secret');
    expect(await verifyPassword('secret', hash)).toBe(true);
  });

  it('fails verification on wrong password', async () => {
    const hash = await hashPassword('secret');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
