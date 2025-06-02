// src/app/lib/types.ts
import type {
  User,
  Group as PrismaGroup,
  GroupMembership as PrismaGroupMembership,
  Event as PrismaEventModel,
  Tip as PrismaTip,
} from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/library';

export type UserOut = Omit<User, 'hashedPassword'>;

export interface UserCreate {
  email: string;
  name?: string | null;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UfcEventItem {
  summary: string | null;
  location: string | null;
  description: string | null;
  uid: string | null;
  dtstart: string | null;
  dtend: string | null;
}

export interface BoxingScheduleItem {
  date: string | null;
  location: string | null;
  broadcaster: string | null;
  details: string | null;
  parsedDate?: string | null;
}

export interface Group extends PrismaGroup {
  creator: {
    // Wird für groupLeaderId in HighscoreCard verwendet
    id: number; // Stelle sicher, dass die ID hier ist, wenn createdById verwendet wird
    name: string | null;
  };
}
export interface GroupCreate {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface GroupMembership extends PrismaGroupMembership {
  group: Group;
}

export interface GroupMembershipCreate {
  user_id: number;
  group_id: number;
}

export interface HighscoreEntry {
  user_id: number;
  name: string;
  points: number;
  leaderSince?: Date | string | null; // Für "Seit X Tagen Nr. 1"
}

export type LeaderboardWinner = {
  // Für GroupHeaderCard
  name: string | null;
  leaderSince?: Date | string | null; // Für "Seit X Tagen Nr. 1"
};

export interface EventPointDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
  points: number | null;
}

export interface Event extends Omit<PrismaEventModel, 'options'> {
  options: string[] | null;
  awardedPoints?: EventPointDetail[];
}

export interface EventCreate {
  title: string;
  description?: string | null;
  group_id: number;
  question: string;
  options: string[];
  tippingDeadline?: string;
}

export interface EventResultSet {
  event_id: number;
  winning_option: string;
}

export interface TipCreate {
  event_id: number;
  selected_option: string;
}

export interface TipOut {
  id: number;
  eventId: number;
  selectedOption: string;
  userId: number;
}

export interface FootballEvent {
  matchID: number;
  competition: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  result?: string | null;
  leagueShortcut?: string;
  leagueSeason?: string;
}

export interface MixedEvent {
  id: string;
  title: string;
  subtitle: string;
  sport: 'ufc' | 'boxing' | 'football';
  date: Date;
  original: UfcEventItem | BoxingScheduleItem | FootballEvent; // Alle drei Typen hier
}

export interface UserTipSelection {
  eventId: number;
  selectedOption: string;
  id?: number;
}

export type AllTipsPerEvent = Record<
  number,
  {
    userId: number;
    userName: string | null;
    selectedOption: string;
  }[]
>;

export interface GroupWithOpenEvents {
  groupId: number;
  groupName: string;
  openEvents: { id: number; title: string }[];
}

export interface EventComment {
  id: number;
  text?: string | null;
  gifUrl?: string | null;
  createdAt: string;
  userId: number;
  eventId: number;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface EventCommentCreate {
  text?: string;
  gifUrl?: string;
}
