// src/app/api/groups/[groupId]/regenerate-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as groupService from '../../../services/groupService';
import { getCurrentUserFromRequest } from '../../../lib/auth';

interface RouteContext {
  params: {
    groupId?: string;
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupIdString = context.params.groupId;
    if (!groupIdString) {
      return NextResponse.json(
        { error: 'Group ID is missing' },
        { status: 400 }
      );
    }
    const groupId = parseInt(groupIdString, 10);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Invalid Group ID format' },
        { status: 400 }
      );
    }

    const updatedGroup = await groupService.regenerateInviteTokenForGroup(
      groupId,
      currentUser.id
    );

    if (!updatedGroup) {
      // Dies kann bedeuten, dass die Gruppe nicht gefunden wurde oder der User nicht berechtigt ist (abhängig von der Service-Logik)
      // Die Service-Funktion wirft bereits einen Fehler bei fehlender Berechtigung.
      return NextResponse.json(
        { error: 'Group not found or failed to update token' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description,
        created_by: updatedGroup.createdById,
        invite_token: updatedGroup.inviteToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Error in POST /api/groups/[groupId]/regenerate-token:',
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    if (errorMessage === 'Unauthorized to regenerate token for this group') {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Could not regenerate invite token.', details: errorMessage },
      { status: 500 }
    );
  }
}
