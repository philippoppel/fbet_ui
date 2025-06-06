// src/app/lib/types.ts
import type {
  User as PrismaUser, // Alias, um Konflikte zu vermeiden, falls User lokal definiert wird
  Group as PrismaGroup,
  GroupMembership as PrismaGroupMembership,
  Event as PrismaEventModel,
  Tip as PrismaTip,
} from '@prisma/client';
// JsonValue wird hier nicht direkt benötigt, kann aber für andere Typen relevant sein

// Basis-Benutzertyp für öffentliche Informationen
export type UserOut = Omit<PrismaUser, 'hashedPassword'>;

export interface UserCreate {
  email: string;
  name?: string | null;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Externe Event-Typen (UFC, Boxen, Fußball) - unverändert
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

// Gruppen-Typen - kleine Anpassung für creator in Group
export interface Group extends Omit<PrismaGroup, 'creator'> {
  creator: Pick<UserOut, 'id' | 'name'>; // Stellt sicher, dass UserOut-Felder hier passen
  // Falls 'memberships' und 'events' immer mitgeladen werden und spezifische Typen haben sollen:
  // memberships?: GroupMembership[]; // Abhängig von deinen API-Antworten
  // events?: Event[];               // Abhängig von deinen API-Antworten
}
export interface GroupCreate {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface GroupMembership extends PrismaGroupMembership {
  group: Group; // Stellt sicher, dass dies Group (nicht PrismaGroup) ist, falls Group erweitert wurde
  user: UserOut; // Stellt sicher, dass UserOut hier verwendet wird
}

export interface GroupMembershipCreate {
  user_id: number; // Beachte Snake Case vs. Camel Case Konventionen
  group_id: number;
}

// Highscore & Leaderboard - unverändert
export interface HighscoreEntry {
  user_id: number;
  name: string;
  points: number;
  leaderSince?: Date | string | null;
}

export type LeaderboardWinner = {
  name: string | null;
  leaderSince?: Date | string | null;
};

// Event & Tip Typen - Event.options ist jetzt string[]
export interface EventPointDetail {
  userId: number;
  userName: string | null;
  selectedOption: string;
  points: number | null;
}

export interface Event extends Omit<PrismaEventModel, 'options' | 'creator'> {
  options: string[] | null; // Prisma liefert Json, Frontend erwartet string[]
  creator: Pick<UserOut, 'id' | 'name'>; // Wie bei Group
  awardedPoints?: EventPointDetail[];
  // comments?: EventComment[]; // Falls Kommentare direkt mit dem Event geladen werden
}

export interface EventCreate {
  title: string;
  description?: string | null;
  question: string;
  options: string[];

  group_id: number;
  tippingDeadline?: string | Date | null;

  has_wildcard?: boolean;
  wildcard_type?: 'EXACT_SCORE' | 'ROUND_FINISH' | 'GENERIC';
  wildcard_prompt?: string | null;
}

export interface EventResultSet {
  event_id: number; // Snake Case
  winning_option: string; // Snake Case
}

export interface TipCreate {
  event_id: number; // Snake Case
  selected_option: string; // Snake Case
}

// TipOut ist die Antwort vom Server nach dem Erstellen eines Tipps
export interface TipOut extends Omit<PrismaTip, 'user' | 'event' | 'points'> {
  // PrismaTip anpassen
  // userId, eventId, selectedOption, id sind Kernfelder
  // points könnten später hinzukommen
  // user und event werden typischerweise nicht vollständig zurückgegeben
}

export interface MixedEvent {
  id: string;
  title: string;
  subtitle: string;
  sport: 'ufc' | 'boxing' | 'football';
  date: Date;
  original: UfcEventItem | BoxingScheduleItem | FootballEvent;
}

export interface UserTipSelection {
  eventId: number;
  selectedOption: string;
  id?: number; // Tip ID, falls vorhanden
}

export type AllTipsPerEvent = Record<
  number, // eventId
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

// *** EventComment Typen - Überarbeitet ***
export interface EventCommentCreate {
  text?: string;
  gifUrl?: string;
}

// Der Haupttyp für EventComment, wie er im Frontend verwendet wird (inkl. Like-Infos)
export interface EventComment {
  id: number;
  text?: string | null;
  gifUrl?: string | null;
  createdAt: string; // ISO String (z.B. von Date.toISOString())
  updatedAt: string; // ISO String
  userId: number; // ID des Kommentar-Autors
  user: Pick<UserOut, 'id' | 'name' | 'email'>; // Autor-Details, Pick für spezifische Felder
  eventId: number;
  likesCount: number;
  likedByCurrentUser: boolean;
}

// API Fehlerklasse (kann hier oder in api.ts definiert werden, hier für Zentralität)
// Die Definition in api.ts aus deinem Snippet ist bereits gut.
// Falls du sie hier zentralisieren willst:
/*
export interface ApiErrorData {
  error?: string;
  details?: any;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  detail?: any; // Oder 'details' je nach Server-Antwort

  constructor(status: number, message: string, detail?: any) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    this.detail = detail;
  }
}
*/
