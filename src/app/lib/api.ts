// src/lib/api.ts
import type {
  UserOut,
  Token,
  UserCreate,
  UfcEventItem,
  BoxingScheduleItem,
  GroupMembership, // Behalte diesen Typ bei
  Group, // Behalte diesen Typ bei
  GroupCreate, // Behalte diesen Typ bei
  HighscoreEntry,
  Event,
  EventCreate,
  TipCreate,
  TipOut,
  EventResultSet,
  GroupMembershipCreate,
  UserTipSelection, // Wird ggf. nicht mehr so direkt verwendet
} from './types'; // Stelle sicher, dass diese Typen mit den Server-Antworten übereinstimmen

// Liest die Backend-URL aus Umgebungsvariablen.
// Für Next.js API Routen in derselben App ist '' (leerer String) oft am besten,
// sodass Anfragen relativ sind (z.B. /api/auth/login).
// Wenn NEXT_PUBLIC_API_BASE_URL gesetzt ist (z.B. http://localhost:3000), funktioniert das auch.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Benutzerdefinierte Fehlerklasse für API-Fehler.
 * Enthält den HTTP-Status und optionale Detailinformationen vom Backend.
 */
export class ApiError extends Error {
  status: number;
  detail?: any;

  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Generische Hilfsfunktion zur Verarbeitung von fetch-Antworten.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail: string | object | undefined;
    try {
      const errorData = await response.json();
      errorDetail = errorData?.detail || errorData?.error; // Berücksichtige auch 'error' Feld
    } catch (e) {
      errorDetail = response.statusText;
    }
    throw new ApiError(
      `API request failed with status ${response.status}`,
      response.status,
      errorDetail
    );
  }

  if (
    response.status === 204 ||
    response.headers.get('Content-Length') === '0'
  ) {
    // Behandle leere Antworten, wenn T dies zulässt (z.B. T ist void oder null)
    // Für jetzt geben wir null zurück und erwarten, dass der Aufrufer damit umgeht.
    return null as T;
  }

  try {
    return (await response.json()) as T;
  } catch (e) {
    console.error('Failed to parse JSON response', e);
    throw new Error(
      `Invalid JSON received from server: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// --- Authentifizierungs-Endpunkte ---
// (Unverändert, aber stelle sicher, dass die Pfade stimmen, z.B. /api/auth/login)

export async function loginUser(
  email: string,
  password: string
): Promise<Token> {
  const endpoint = `${API_BASE_URL}/api/auth/login`; // Pfad angepasst
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<Token>(response);
}

export async function getCurrentUser(token: string): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    // Pfad angepasst
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserOut>(response);
}

export async function registerUser(userData: UserCreate): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    // Pfad angepasst
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse<UserOut>(response);
}

// --- Gruppen- & Mitgliedschafts-Endpunkte (ANGEPASST) ---

export async function createGroup(
  token: string,
  groupData: GroupCreate
): Promise<Group> {
  // Server-Route: POST /api/groups
  const response = await fetch(`${API_BASE_URL}/api/groups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groupData),
  });
  // Erwartet, dass die Server-Antwort den 'invite_token' enthält.
  // Stelle sicher, dass dein 'Group' Typ dies widerspiegelt.
  return handleResponse<Group>(response);
}

export async function getMyGroups(token: string): Promise<Group[]> {
  // Server-Route: GET /api/groups
  const response = await fetch(`${API_BASE_URL}/api/groups`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Group[]>(response);
}

export async function getGroupDetails(
  token: string,
  groupId: number
): Promise<Group> {
  // Server-Route: GET /api/groups/{groupId}
  const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Group>(response);
}

export async function joinGroupByInviteToken( // Umbenannt für Klarheit, war vorher joinGroupByToken
  authToken: string, // Dein normaler Auth-Token
  groupInviteToken: string // Der Invite-Token der Gruppe
): Promise<GroupMembership> {
  // Der Server gibt die erstellte Mitgliedschaft zurück
  // Server-Route: POST /api/groups/invite/{inviteToken}
  const endpointUrl = `${API_BASE_URL}/api/groups/invite/${encodeURIComponent(groupInviteToken)}`;

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      // Kein 'Content-Type' oder 'body' nötig, da der Token im Pfad ist
    },
  });
  return handleResponse<GroupMembership>(response);
}

export async function regenerateGroupInviteToken(
  token: string,
  groupId: number
): Promise<Group> {
  // Erwartet das aktualisierte Group-Objekt mit neuem Token
  // Server-Route: POST /api/groups/{groupId}/regenerate-token
  const response = await fetch(
    `${API_BASE_URL}/api/groups/${groupId}/regenerate-token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<Group>(response);
}

export async function addMemberToGroup(
  token: string,
  groupId: number,
  userIdToAdd: number // Oder E-Mail, je nach Server-Implementierung
): Promise<GroupMembership> {
  // Beispielhafter Server-Pfad: POST /api/groups/${groupId}/members
  const response = await fetch(
    `${API_BASE_URL}/api/groups/${groupId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userIdToAdd }), // Body anpassen
    }
  );
  return handleResponse<GroupMembership>(response);
}

export async function getGroupMembers(
  token: string,
  groupId: number
): Promise<UserOut[]> {
  // Gibt typischerweise eine Liste von User-Objekten zurück
  // Beispielhafter Server-Pfad: GET /api/groups/${groupId}/members
  const response = await fetch(
    `${API_BASE_URL}/api/groups/${groupId}/members`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return handleResponse<UserOut[]>(response);
}

export async function getMyMemberships(
  token: string
): Promise<GroupMembership[]> {
  // Beispielhafter Server-Pfad, falls benötigt: GET /api/users/me/memberships
  const response = await fetch(`${API_BASE_URL}/api/users/me/memberships`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<GroupMembership[]>(response);
}

// --- Externe Daten Endpunkte ---

export async function getUfcSchedule(): Promise<UfcEventItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/external/ufc-schedule` // Pfad angepasst
  );
  return handleResponse<UfcEventItem[]>(response);
}

export async function getBoxingSchedule(): Promise<BoxingScheduleItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/external/boxing-schedule` // Pfad angepasst
  );
  return handleResponse<BoxingScheduleItem[]>(response);
}

// --- Event- & Tipp-Endpunkte ---
// (Pfade anpassen, falls sie unter /api/... liegen und entsprechend der Server-Logik)
// Die Pfade hier scheinen eher spezifisch zu sein und könnten so bleiben,
// wenn sie bereits auf deine Next.js API Routen Struktur passen.
// z.B. /api/events/group/{groupId} etc.

export async function getGroupEvents(
  token: string,
  groupId: number
): Promise<Event[]> {
  // Annahme: Pfad ist /api/events/group/{groupId}
  const response = await fetch(`${API_BASE_URL}/api/events/group/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Event[]>(response);
}

export async function getGroupHighscore(
  token: string,
  groupId: number
): Promise<HighscoreEntry[]> {
  // Annahme: Pfad ist /api/tips/highscore/{groupId}
  const response = await fetch(
    `${API_BASE_URL}/api/tips/highscore/${groupId}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return handleResponse<HighscoreEntry[]>(response);
}

export async function createEvent(
  token: string,
  eventData: EventCreate
): Promise<Event> {
  // Annahme: Pfad ist /api/events
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });
  return handleResponse<Event>(response);
}

export async function submitTip(
  token: string,
  tipData: TipCreate
): Promise<TipOut> {
  const response = await fetch(`${API_BASE_URL}/api/tips`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tipData),
  });
  return handleResponse<TipOut>(response);
}

export async function setEventResult(
  token: string,
  resultData: EventResultSet
): Promise<Event> {
  // Annahme: Pfad ist /api/events/result
  const response = await fetch(`${API_BASE_URL}/api/events/result`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resultData),
  });
  return handleResponse<Event>(response);
}

export async function getMyTipsForGroup(
  token: string,
  groupId: number
): Promise<UserTipSelection[]> {
  // Ruft die neue GET-Route im Backend auf
  const response = await fetch(`${API_BASE_URL}/api/tips?groupId=${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  // handleResponse verwenden, erwartet jetzt ein Array von UserTipSelection
  return handleResponse<UserTipSelection[]>(response);
}
