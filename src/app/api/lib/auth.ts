// src/app/api/lib/auth.ts
import { NextRequest } from 'next/server';
import { verifyJwt } from './jwt'; // Deine existierende JWT-Logik-Datei
import { prisma } from './prisma'; // Deine globale Prisma Client Instanz
// Stelle sicher, dass der Prisma Client User Typ importiert wird, falls nicht automatisch erkannt
// import type { User as PrismaUser } from '@prisma/client';

// Definiere, wie dein User-Objekt aussehen soll, das von dieser Funktion zurückgegeben wird.
// Diese Felder sollten mit dem `select` in `prisma.user.findUnique` übereinstimmen.
export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null; // Hinzugefügt, da es im select enthalten ist
  isActive: boolean; // Hinzugefügt, da es im select enthalten ist
}

export async function getCurrentUserFromRequest(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  let tokenValue: string | undefined = undefined;

  // 1. Versuche, Token aus dem Authorization-Header zu lesen
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.split(' ')[1];
    // Überprüfe, ob der Token nach dem Split tatsächlich existiert und nicht "null" oder "undefined" als String ist
    if (
      headerToken &&
      headerToken.toLowerCase() !== 'null' &&
      headerToken.toLowerCase() !== 'undefined'
    ) {
      tokenValue = headerToken;
      console.log('[Auth] Token from Authorization header utilized.');
    } else {
      console.log(
        '[Auth] Authorization header was "Bearer null/undefined", ignoring header.'
      );
    }
  }

  // 2. Wenn kein (gültiger) Token im Header, versuche, ihn aus dem 'fbet_token'-Cookie zu lesen
  if (!tokenValue) {
    const cookie = req.cookies.get('fbet_token'); // 'fbet_token' ist der Name deines Cookies
    if (cookie && cookie.value) {
      tokenValue = cookie.value;
      console.log('[Auth] Token from "fbet_token" cookie utilized.');
    }
  }

  if (!tokenValue) {
    console.log(
      '[Auth] No valid token found in Authorization header or "fbet_token" cookie.'
    );
    return null;
  }

  try {
    const decodedPayload = verifyJwt(tokenValue); // Deine verifyJwt Funktion
    if (!decodedPayload) {
      console.log(
        '[Auth] Token verification failed or token is invalid/expired. Token used (first 10 chars):',
        tokenValue.substring(0, 10) + '...'
      );
      return null;
    }

    let userId: number | undefined = undefined;

    if (decodedPayload.userId && typeof decodedPayload.userId === 'number') {
      userId = decodedPayload.userId;
    } else if (decodedPayload.sub && typeof decodedPayload.sub === 'string') {
      const parsedId = parseInt(decodedPayload.sub, 10);
      if (!isNaN(parsedId)) {
        userId = parsedId;
      }
    } else if (decodedPayload.id && typeof decodedPayload.id === 'number') {
      userId = decodedPayload.id;
    }
    // Du kannst hier bei Bedarf weitere Felder aus dem JWT Payload prüfen

    if (userId === undefined) {
      console.log(
        '[Auth] User ID (userId, sub, or id) not found or invalid in JWT payload:',
        decodedPayload
      );
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true, // Wie in deinem ursprünglichen Code
        isActive: true, // Wie in deinem ursprünglichen Code
      },
    });

    if (!user) {
      console.log(`[Auth] User with ID ${userId} not found in database.`);
      return null;
    }

    if (!user.isActive) {
      console.log(`[Auth] User with ID ${userId} is not active.`);
      return null;
    }

    // Das 'user' Objekt von Prisma sollte nun dem 'AuthenticatedUser' Interface entsprechen.
    return user as AuthenticatedUser;
  } catch (error) {
    console.error(
      '[Auth] Error during token verification, JWT parsing, or database lookup:',
      error
    );
    return null;
  }
}
