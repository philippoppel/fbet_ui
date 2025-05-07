// src/app/api/lib/auth.ts
import { NextRequest } from 'next/server';
import { verifyJwt } from './jwt'; // Deine existierende JWT-Logik-Datei
// Passe den Pfad an, falls deine Datei anders heißt
// z.B. './deine-jwt-datei'
import { prisma } from './prisma'; // Deine globale Prisma Client Instanz
import { User } from '@prisma/client';

// Definiere, wie dein User-Objekt aussehen soll, das von dieser Funktion zurückgegeben wird.
// Es sollte mindestens die ID enthalten.
export interface AuthenticatedUser {
  id: number;
  email: string;
  // Füge hier weitere Felder hinzu, die du häufig benötigst, z.B. name, isActive
  // Diese sollten mit den Feldern übereinstimmen, die du im `select` unten auswählst.
}

export async function getCurrentUserFromRequest(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Bearer token found in Authorization header');
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Token is empty after splitting Bearer');
      return null;
    }

    const decodedPayload = verifyJwt(token); // Deine verifyJwt Funktion
    if (!decodedPayload) {
      console.log('Token verification failed or token is invalid/expired');
      return null;
    }

    // Stelle sicher, dass die Payload eine userId enthält.
    // Der Typ von decodedPayload.userId könnte string oder number sein, je nachdem, wie es im JWT gespeichert wird.
    // Prisma erwartet eine number für die ID, also konvertieren wir ggf.
    let userId: number | undefined = undefined;

    if (decodedPayload.userId && typeof decodedPayload.userId === 'number') {
      userId = decodedPayload.userId;
    } else if (decodedPayload.sub && typeof decodedPayload.sub === 'string') {
      // 'sub' ist ein gängiges Feld für User ID
      const parsedId = parseInt(decodedPayload.sub, 10);
      if (!isNaN(parsedId)) {
        userId = parsedId;
      }
    } else if (decodedPayload.id && typeof decodedPayload.id === 'number') {
      // Falls du 'id' direkt verwendest
      userId = decodedPayload.id;
    }
    // Füge weitere Checks hinzu, falls deine User-ID anders in der Payload heißt

    if (userId === undefined) {
      console.log(
        'User ID (userId, sub, or id) not found or invalid in JWT payload',
        decodedPayload
      );
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true, // Beispiel: auch den Namen laden
        isActive: true, // Wichtig, um inaktive User auszuschließen
      },
    });

    if (!user) {
      console.log(`User with ID ${userId} not found in database.`);
      return null;
    }

    if (!user.isActive) {
      console.log(`User with ID ${userId} is not active.`);
      return null;
    }

    return user as AuthenticatedUser; // Stelle sicher, dass die ausgewählten Felder zum Interface passen
  } catch (error) {
    console.error('Error in getCurrentUserFromRequest:', error);
    return null;
  }
}
