// src/app/api/services/groupService.ts

import { GroupCreateInput } from '../lib/groupSchema';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/app/api/lib/prisma';
import type { Group, GroupMembership, User } from '@prisma/client';

export async function createGroup(
  groupData: GroupCreateInput,
  creatorId: number
): Promise<Group> {
  const inviteToken = uuidv4();
  console.log(`Generated invite_token: ${inviteToken}`);

  const newGroup = await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: groupData.name,
        description: groupData.description,
        createdById: creatorId,
        inviteToken: inviteToken,
      },
    });

    await tx.groupMembership.create({
      data: {
        userId: creatorId,
        groupId: group.id,
      },
    });

    console.log(
      `Transaction for group ${group.id} and initial membership for user ${creatorId} should be committed.`
    );
    return group;
  });

  console.log(
    `Service returning newGroup with ID: ${newGroup.id}, Token: ${newGroup.inviteToken}`
  );
  return newGroup;
}

export async function getGroupById(groupId: number): Promise<Group | null> {
  return prisma.group.findUnique({
    where: { id: groupId },
  });
}

export async function getUserGroups(
  userId: number,
  skip: number = 0,
  limit: number = 100
): Promise<Group[]> {
  return prisma.group.findMany({
    where: {
      memberships: {
        some: {
          userId: userId,
        },
      },
    },
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getGroupByInviteToken(
  token: string
): Promise<Group | null> {
  return prisma.group.findUnique({
    where: { inviteToken: token },
  });
}

export async function regenerateInviteTokenForGroup(
  groupId: number,
  currentUserId: number
): Promise<Group | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    return null;
  }

  if (group.createdById !== currentUserId) {
    throw new Error('Unauthorized to regenerate token for this group');
  }

  const newInviteToken = uuidv4();
  return prisma.group.update({
    where: { id: groupId },
    data: { inviteToken: newInviteToken },
  });
}

export async function getMembersOfGroup(groupId: number): Promise<User[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: groupId },
    include: {
      user: true, // Lädt die zugehörigen Benutzerdaten
    },
  });

  // Extrahiere und gib die Benutzerobjekte zurück
  return memberships.map((membership) => membership.user);
}

export async function isUserMemberOfGroup(
  userId: number,
  groupId: number
): Promise<boolean> {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      userId,
      groupId,
    },
  });
  return !!membership;
}

export async function addUserToGroup(
  userId: number,
  groupId: number
): Promise<GroupMembership> {
  const alreadyMember = await isUserMemberOfGroup(userId, groupId);
  if (alreadyMember) {
    console.log(`User ${userId} is already a member of group ${groupId}.`);
    throw new Error('User is already a member of this group.');
  }

  return prisma.groupMembership.create({
    data: {
      userId,
      groupId,
    },
  });
}
