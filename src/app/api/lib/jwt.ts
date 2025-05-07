// src/app/lib/jwt.ts
import jwt, { JwtPayload } from 'jsonwebtoken'; // JwtPayload importiert

const SECRET: string =
  process.env.SECRET_KEY ??
  (() => {
    throw new Error('SECRET_KEY not set');
  })();
const EXPIRES_IN: string = process.env.ACCESS_TOKEN_EXPIRE_DAYS || '30d';

if (!SECRET) {
  throw new Error(
    'JWT_SECRET (SECRET_KEY) is not set in environment variables'
  );
}

// Payload kann jetzt spezifischer sein, um 'sub' zu erwarten
interface AppJwtPayload extends JwtPayload {
  sub: string; // User ID wird als String gespeichert, um konsistent mit Python zu sein
}

export function signJwt(payload: { sub: string | number }): string {
  // Akzeptiert string oder number für sub
  return jwt.sign(
    { sub: String(payload.sub) },
    SECRET as jwt.Secret, // <- cast auf richtigen Typ
    { expiresIn: EXPIRES_IN } as jwt.SignOptions // <- cast auf richtige Options
  );
}

export function verifyJwt(token: string): AppJwtPayload | null {
  try {
    // Explizit den Typ für den dekodierten Wert angeben
    const decoded = jwt.verify(token, SECRET) as AppJwtPayload;
    // Zusätzliche Prüfung, ob 'sub' tatsächlich vorhanden ist
    if (typeof decoded.sub !== 'string') {
      console.error("JWT 'sub' claim is missing or not a string:", decoded);
      return null;
    }
    return decoded;
  } catch (error) {
    // Bei Fehlern (ungültig, abgelaufen etc.) null zurückgeben
    console.warn(
      'JWT verification failed:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
