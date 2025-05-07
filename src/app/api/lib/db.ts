import { neon } from '@neondatabase/serverless';

console.log('[db.ts] DATABASE_URL:', process.env.DATABASE_URL); // Logge den Wert
if (
  typeof process.env.DATABASE_URL !== 'string' ||
  !process.env.DATABASE_URL.startsWith('postgres')
) {
  console.error(
    '[db.ts] FATAL: DATABASE_URL is undefined, not a string, or not a valid postgres URL.'
  );
  // throw new Error('DATABASE_URL misconfiguration in db.ts'); // Vorerst auskommentiert lassen
}

export const sql = neon(process.env.DATABASE_URL!);
