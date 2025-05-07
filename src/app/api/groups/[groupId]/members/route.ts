// src/app/api/groups/[groupId]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import type { UserOut } from '@/app/lib/types';
import { getCurrentUserFromRequest } from '@/app/api/lib/auth';
import * as groupService from '../../../services/groupService';

/* ------------------------------------------------------------
   Hilfsfunktion: Prisma-User → DTO ohne sensible Felder
------------------------------------------------------------ */
function mapUserToUserOut(user: User): UserOut {
  const { hashedPassword, ...rest } = user;
  return rest;
}

/* ------------------------------------------------------------
   Route-Handler für GET /api/groups/[groupId]/members
------------------------------------------------------------ */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: groupIdString } = await params;

  if (!groupIdString) {
    return NextResponse.json(
      { error: 'Group ID is missing in path' },
      { status: 400 }
    );
  }

  const groupId = Number(groupIdString);
  if (!Number.isInteger(groupId)) {
    return NextResponse.json(
      { error: 'Invalid Group ID format' },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupExists = await groupService.getGroupById(groupId);
  if (!groupExists) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const isMember = await groupService.isUserMemberOfGroup(
    currentUser.id,
    groupId
  );

  if (!isMember && groupExists.createdById !== currentUser.id) {
    return NextResponse.json(
      { error: "Access to this group's members is not allowed." },
      { status: 403 }
    );
  }

  const members = await groupService.getMembersOfGroup(groupId);
  const membersOut: UserOut[] = members.map(mapUserToUserOut);

  return NextResponse.json(membersOut, { status: 200 });
}
