// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token);
    const userId = Number(payload?.sub);

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Inactive user' }, { status: 400 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    const payload = verifyJwt(token);
    const userId = Number(payload?.sub);

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const json = await req.json();

    // Ganz simpel: nur den Namen erlauben
    const newName = json?.name;
    if (
      typeof newName !== 'string' ||
      newName.trim().length < 2 ||
      newName.length > 50
    ) {
      return NextResponse.json(
        { error: 'Invalid name (must be 2-50 characters)' },
        { status: 400 }
      );
    }

    // Update in DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: newName.trim() },
      select: { id: true, email: true, name: true, isActive: true },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err) {
    console.error('Error in PATCH /api/auth/me:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
