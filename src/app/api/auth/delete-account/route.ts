// src/app/api/auth/delete-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyJwt(token); // Nimmt an, dass verifyJwt bei Fehler wirft oder null zurückgibt

    if (!payload || !payload.sub) {
      // payload.sub enthält normalerweise die User-ID
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    const userIdToDelete = Number(payload.sub);

    const userExists = await prisma.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found or already deleted' },
        { status: 404 }
      );
    }

    // Dank der onDelete-Regeln im Schema werden Abhängigkeiten jetzt korrekt von Prisma behandelt:
    // - GroupMemberships des Users werden gelöscht.
    // - Tip.userId und EventComment.userId werden auf NULL gesetzt.
    // - Group.createdById und Event.createdById werden auf NULL gesetzt.
    await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    // TODO: Gegebenenfalls weitere Aktionen durchführen, z.B.
    // - Aktive Sessions des Users invalidieren
    // - Den Client anweisen, Cookies/localStorage zu löschen

    return NextResponse.json(
      { message: 'Account successfully deleted and related data updated.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting account:', error);
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return NextResponse.json(
        { error: `Unauthorized: ${error.message}` },
        { status: 401 }
      );
    }
    // Prisma spezifischer Fehler, falls das Record trotz vorheriger Prüfung nicht gefunden wird
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User to delete was not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: 'Internal server error during account deletion.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
