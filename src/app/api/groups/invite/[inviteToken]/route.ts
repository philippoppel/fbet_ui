// src/app/api/groups/invite/[inviteToken]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as groupService from '../../../services/groupService';
import { getCurrentUserFromRequest } from '../../../lib/auth';

interface RouteContext {
  params: {
    inviteToken?: string;
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be logged in to join a group.' },
        { status: 401 }
      );
    }

    const inviteToken = context.params.inviteToken;
    if (!inviteToken) {
      return NextResponse.json(
        { error: 'Invite token is missing' },
        { status: 400 }
      );
    }

    const group = await groupService.getGroupByInviteToken(inviteToken);
    if (!group) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token. Group not found.' },
        { status: 404 }
      );
    }

    // Versuch, den Benutzer zur Gruppe hinzuzufügen
    const membership = await groupService.addUserToGroup(
      currentUser.id,
      group.id
    );
    // Die Service-Funktion addUserToGroup wirft einen Fehler, wenn der User bereits Mitglied ist.
    // Dieser Fehler wird vom catch-Block unten behandelt.

    if (!membership) {
      // Dieser Fall sollte nicht eintreten, wenn addUserToGroup entweder ein membership-Objekt zurückgibt oder einen Fehler wirft.
      // Aber als Sicherheitsnetz:
      return NextResponse.json(
        { error: 'Failed to join group for an unknown reason.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully joined group: ${group.name}`,
        groupId: group.id,
        userId: currentUser.id,
        membershipId: membership.id,
      },
      { status: 200 }
    ); // Oder 201 Created, wenn die Mitgliedschaft als Ressource betrachtet wird
  } catch (error) {
    console.error('Error in POST /api/groups/invite/[inviteToken]:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    if (errorMessage === 'User is already a member of this group.') {
      return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json(
      {
        error: 'Could not join group using invite token.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
