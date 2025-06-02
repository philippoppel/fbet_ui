// src/app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import {
  getCurrentUserFromRequest,
  AuthenticatedUser,
} from '@/app/api/lib/auth'; // Konsistent mit auth.ts

export async function POST(request: NextRequest) {
  try {
    const currentUser: AuthenticatedUser | null =
      await getCurrentUserFromRequest(request);
    if (!currentUser?.id) {
      // Keine gültige User-Session oder User-ID nicht im Token
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let endpoint: string | undefined;
    try {
      const body = await request.json();
      endpoint = body.endpoint;
    } catch (e) {
      console.warn('[API /push/unsubscribe] Invalid JSON in request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body: Must be valid JSON.' },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Endpoint missing or invalid in request body' },
        { status: 400 }
      );
    }

    const result = await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: endpoint,
        userId: currentUser.id, // Stelle sicher, dass nur die Subscription des aktuellen Users gelöscht wird
      },
    });

    if (result.count > 0) {
      console.log(
        `[API /push/unsubscribe] User ${currentUser.id} successfully unsubscribed endpoint: ${endpoint.substring(0, 30)}...`
      );
      return NextResponse.json(
        { message: 'Unsubscribed successfully' },
        { status: 200 }
      );
    } else {
      // Kein Eintrag zum Löschen gefunden - entweder bereits abgemeldet oder Endpoint war nie registriert für diesen User.
      // Ein 200er ist hier oft passend, da der gewünschte Zustand (nicht abonniert) erreicht ist.
      console.log(
        `[API /push/unsubscribe] No active subscription found for user ${currentUser.id} with endpoint: ${endpoint.substring(0, 30)}... to delete. Considered unsubscribed.`
      );
      return NextResponse.json(
        {
          message:
            'No active subscription found for this endpoint and user, or already unsubscribed.',
        },
        { status: 200 } // Alternativ 404, falls du "Resource not found" signalisieren willst
      );
    }
  } catch (error: any) {
    console.error(
      '[API /push/unsubscribe] General error during unsubscription:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to unsubscribe due to a server error.' },
      { status: 500 }
    );
  }
}
