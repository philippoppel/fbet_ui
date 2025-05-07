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
}

export interface GroupMembership extends PrismaGroupMembership {
  group: Group; // Beachte, dass PrismaGroupMembership von @prisma/client 'group' nicht enthält
  // Du müsstest diese Relation manuell hinzufügen, wenn du sie clientseitig so brauchst
  // oder sicherstellen, dass sie über 'include' geladen wird und der Typ passt.
}

export interface GroupMembershipCreate {
  user_id: number;
  group_id: number;
}

export interface HighscoreEntry {
  user_id: number;
  name: string; // Der Name des Users
  points: number;
}

// NEU: Typ für die Detailinformationen zu Punkten pro User für ein Event
export interface EventPointDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
  points: number | null;
}

// Erweiterter Event-Typ für das Frontend
// Erbt von PrismaEventModel und fügt awardedPoints hinzu.
// Klärt auch den Typ von 'options'.
export interface Event extends Omit<PrismaEventModel, 'options'> {
  // Nimm alle Felder von PrismaEventModel außer 'options'
  options: string[] | null; // Definiere 'options' als string-Array oder null für den Client
  awardedPoints?: EventPointDetail[]; // Optionales Array mit den Punkte-Details
}

export interface EventCreate {
  title: string;
  description?: string | null;
  group_id: number;
  question: string;
  options: string[]; // Beim Erstellen erwarten wir string[]
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
