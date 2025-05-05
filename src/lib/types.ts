// src/lib/types.ts

// Basierend auf app/schemas/user.py -> UserOut
export interface UserOut {
  id: number;
  email: string; // Pydantic EmailStr wird zu string
  // @ts-ignore
  name: string | null; // Optional[str] wird zu string | null
  is_active: boolean;
}

export interface UserCreate {
  email: string;
  name?: string | null; // Wird zu string | null | undefined im Frontend oft
  password: string;
}

// Basierend auf app/schemas/user.py -> Token
export interface Token {
  access_token: string;
  token_type: string; // Normalerweise "bearer"
}

// Basierend auf #/components/schemas/UfcEventItem
export interface UfcEventItem {
  summary: string | null;
  location: string | null;
  description: string | null;
  uid: string | null;
  dtstart: string | null; // Datum/Zeit als String
  dtend: string | null; // Datum/Zeit als String
}

// Basierend auf #/components/schemas/BoxingScheduleItem
export interface BoxingScheduleItem {
  date: string | null;
  location: string | null;
  broadcaster: string | null;
  details: string | null;
}

// Basierend auf #/components/schemas/GroupMembership
export interface GroupMembership {
  user_id: number;
  group_id: number;
  id: number;
  group: Group;
}

// Basierend auf #/components/schemas/Group (wird später nützlich)
export interface Group {
  name: string;
  description: string | null;
  id: number;
  created_by: number;
}

// Basierend auf #/components/schemas/Event (wird später nützlich)
export interface Event {
  title: string;
  description: string | null;
  group_id: number;
  question: string;
  options: string[];
  id: number;
  created_by: number;
  winning_option: string | null;
}

// Basierend auf #/components/schemas/HighscoreEntry (wird später nützlich)
export interface HighscoreEntry {
  user_id: number;
  name: string; // Annahme: Name des Users wird mitgeliefert
  points: number;
}

export interface Group {
  name: string;
  description: string | null;
  id: number;
  created_by: number; // Evtl. nützlich später
}

export interface GroupCreate {
  name: string;
  description?: string | null;
}

export interface Group {
  name: string;
  description: string | null;
  id: number;
  created_by: number;
  invite_token: string;
}

export interface HighscoreEntry {
  user_id: number;
  name: string; // Annahme lt. Schema: Name des Users wird geliefert
  points: number;
}

export interface GroupMembershipCreate {
  user_id: number;
  group_id: number;
}

export interface Event {
  title: string;
  description: string | null;
  group_id: number;
  question: string;
  options: string[]; // Liste der Wettoptionen
  id: number;
  created_by: number;
  winning_option: string | null; // Wichtig, um offene von abgeschlossenen Wetten zu unterscheiden
}

export interface EventCreate {
  title: string;
  description?: string | null;
  group_id: number;
  question: string;
  options: string[];
}

export interface TipCreate {
  event_id: number;
  selected_option: string;
}

// Basierend auf POST /tips/ Response Body (TipOut)
export interface TipOut extends TipCreate {
  id: number;
  user_id: number;
}

// Basierend auf POST /events/result Request Body
export interface EventResultSet {
  event_id: number;
  winning_option: string;
}

export interface MixedEvent {
  id: string;
  title: string;
  subtitle: string;
  sport: 'ufc' | 'boxing';
  date: Date;
  original: UfcEventItem | BoxingScheduleItem;
}

// Optional: Du könntest hier auch Typen für andere Schemas
// wie UserCreate definieren, falls du sie im Frontend brauchst.
// export interface UserCreate {
//   email: string;
//   name?: string | null;
//   password: string;
// }
