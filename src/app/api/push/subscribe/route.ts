// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import {
  getCurrentUserFromRequest,
  AuthenticatedUser,
} from '@/app/api/lib/auth'; // Deine Auth-Funktion

export async function POST(request: NextRequest) {
  try {
    const currentUser: AuthenticatedUser | null =
      await getCurrentUserFromRequest(request);
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // Upsert: Erstellt oder aktualisiert die Subscription basierend auf dem Endpoint
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: currentUser.id, // Verknüpfung mit dem eingeloggten Nutzer
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: currentUser.id,
      },
    });

    return NextResponse.json(
      { message: 'Subscribed successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /push/subscribe] Error saving subscription:', error);
    // Hier könntest du spezifischere Fehler basierend auf dem Error-Typ zurückgeben
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
