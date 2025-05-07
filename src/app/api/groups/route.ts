// src/app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groupCreateSchema } from '../lib/groupSchema';
import * as groupService from '../services/groupService';
import { getCurrentUserFromRequest } from '../lib/auth'; // Dein Auth-Helfer

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    // ---- HIER IST DER ERSTE WICHTIGE LOG ----
    console.log(
      'Received payload for group creation:',
      JSON.stringify(json, null, 2)
    );

    const parsed = groupCreateSchema.safeParse(json);

    if (!parsed.success) {
      // ---- HIER IST DER ZWEITE WICHTIGE LOG BEI VALIDIERUNGSFEHLER ----
      console.error('Zod validation failed:', parsed.error.flatten());
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newGroup = await groupService.createGroup(
      parsed.data,
      currentUser.id
    );

    // Stelle sicher, dass inviteToken im newGroup Objekt enthalten ist
    // und die Felder mit deinem clientseitigen Typ 'Group' übereinstimmen.
    // Prisma gibt Felder in camelCase zurück (z.B. createdById, inviteToken).
    return NextResponse.json(
      {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        created_by_id: newGroup.createdById, // Konsistent mit Prisma-Modell (createdById)
        inviteToken: newGroup.inviteToken, // Konsistent mit Prisma-Modell (inviteToken)
        // Wenn dein Client 'created_by' und 'invite_token' erwartet, musst du hier mappen:
        // created_by: newGroup.createdById,
        // invite_token: newGroup.inviteToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/groups:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: 'Could not create group.', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Paginierungs-Parameter aus der URL lesen (optional)
    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const userGroups = await groupService.getUserGroups(
      currentUser.id,
      skip,
      limit
    );

    // Formatierung der Antwort, um konsistent mit dem Python-Schema und ggf. Client-Typen zu sein.
    // Dein Prisma-Modell verwendet camelCase (createdById, inviteToken).
    const formattedGroups = userGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      created_by_id: group.createdById, // von Prisma
      inviteToken: group.inviteToken, // von Prisma
      // Wenn dein Client 'created_by' und 'invite_token' (snake_case) erwartet, dann hier anpassen:
      // created_by: group.createdById,
      // invite_token: group.inviteToken,
    }));

    return NextResponse.json(formattedGroups, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/groups:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: 'Could not retrieve groups.', details: errorMessage },
      { status: 500 }
    );
  }
}
