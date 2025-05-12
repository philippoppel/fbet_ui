// src/lib/types.ts
import type {
  User,
  Group as PrismaGroup,
  GroupMembership as PrismaGroupMembership,
  Event as PrismaEventModel, // Umbenannt, um Konflikt mit unserem erweiterten Typ zu vermeiden
  Tip as PrismaTip,
} from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/library'; // Für den Optionstyp

/**
 * Der Benutzer wie vom Server zurückgegeben (ohne Passwort)
 */
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
}

export type Group = PrismaGroup;

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
}

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

export interface MixedEvent {
  id: string;
  title: string;
  subtitle: string;
  sport: 'ufc' | 'boxing';
  date: Date;
  original: UfcEventItem | BoxingScheduleItem;
}

export interface UserTipSelection {
  eventId: number;
  selectedOption: string;
  id?: number;
}

// NEU: Typ für die Antwort des /api/tips/group-all Endpunkts
// Beschreibt ein Objekt, bei dem der Schlüssel die Event-ID (als Zahl) ist
// und der Wert ein Array von Tipp-Details für dieses Event ist.
export type AllTipsPerEvent = Record<
  number, // eventId
  {
    userId: number;
    userName: string | null;
    selectedOption: string;
  }[]
>;

// Bestehender Typ für GroupWithOpenEvents
export interface GroupWithOpenEvents {
  groupId: number;
  groupName: string;
  openEvents: { id: number; title: string }[];
}

export interface EventComment {
  id: number;
  text?: string | null; // Erlaube null, falls DB null speichert
  gifUrl?: string | null;
  createdAt: string; // ISO-String Datum
  userId: number;
  eventId: number;
  user: {
    // Eingebettete User-Infos
    id: number;
    name: string | null;
    email: string;
  };
}

export interface EventCommentCreate {
  text?: string;
  gifUrl?: string;
}
