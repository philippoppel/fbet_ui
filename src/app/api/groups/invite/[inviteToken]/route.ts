// src/app/api/groups/invite/[inviteToken]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as groupService from '../../../services/groupService';
import { getCurrentUserFromRequest } from '../../../lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteToken: string }> }
) {
  try {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be logged in to join a group.' },
        { status: 401 }
      );
    }

    const { inviteToken } = await params;
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

    const membership = await groupService.addUserToGroup(
      currentUser.id,
      group.id
    );

    if (!membership) {
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
    );
  } catch (error) {
    console.error('Error in POST /api/groups/invite/[inviteToken]:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown server error';
    if (errorMessage === 'User is already a member of this group.') {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
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
