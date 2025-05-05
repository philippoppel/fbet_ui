// src/lib/api.ts
import type {
  UserOut,
  Token,
  UserCreate,
  UfcEventItem,
  BoxingScheduleItem,
  GroupMembership,
  Group,
  GroupCreate,
  HighscoreEntry,
  Event,
  EventCreate,
  TipCreate,
  TipOut,
  EventResultSet,
  GroupMembershipCreate, // Sicherstellen, dass Event auch importiert wird
  // Zukünftige Typen hier hinzufügen, z.B.: TipCreate, TipOut
} from './types';

// Liest die Backend-URL aus Umgebungsvariablen oder nimmt einen Standardwert
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Benutzerdefinierte Fehlerklasse für API-Fehler.
 * Enthält den HTTP-Status und optionale Detailinformationen vom Backend.
 */
export class ApiError extends Error {
  status: number;
  detail?: any; // Kann String oder Objekt sein, je nach Backend-Antwort

  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Generische Hilfsfunktion zur Verarbeitung von fetch-Antworten.
 * Prüft auf HTTP-Fehler und parst die JSON-Antwort in den erwarteten Typ T.
 * @template T Der erwartete Datentyp der erfolgreichen JSON-Antwort.
 * @param {Response} response Das Response-Objekt von fetch.
 * @returns {Promise<T>} Ein Promise, das zum erwarteten Typ T aufgelöst wird.
 * @throws {ApiError} Wenn die Antwort einen HTTP-Fehlerstatus hat.
 * @throws {Error} Wenn die Antwort nicht erfolgreich JSON-geparst werden kann.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail: string | object | undefined;
    try {
      // Versuche, Fehlerdetails als JSON zu lesen
      const errorData = await response.json();
      errorDetail = errorData?.detail; // Standard-Fehlerdetail von FastAPI/Pydantic
    } catch (e) {
      // Ignoriere Fehler, wenn Body kein JSON ist oder leer
      errorDetail = response.statusText; // Fallback auf Status-Text
    }
    throw new ApiError(
      `API request failed with status ${response.status}`,
      response.status,
      errorDetail
    );
  }

  // Behandle leere Antworten (z.B. 204 No Content)
  // Wenn T = void oder null sein könnte, muss dies angepasst werden.
  // Aktuell gehen wir davon aus, dass T immer einen JSON-Body erwartet.
  if (
    response.status === 204 ||
    response.headers.get('Content-Length') === '0'
  ) {
    // Wenn T 'void' oder 'null' sein könnte: return undefined as T / return null as T;
    // Ansonsten ist ein leerer Body unerwartet, wenn T einen Wert erwartet.
    // Wir lassen es vorerst auf response.json() hinauslaufen, was fehlschlagen wird.
    // Besser wäre ggf.: throw new Error('Received empty response body when data was expected.');
    // Für dieses Projekt erwarten wir aber meist JSON.
  }

  try {
    const data = await response.json();
    // Wir verwenden eine Typ-Assertion, da wir der API vertrauen (müssen),
    // dass sie das korrekte Format für Typ T liefert.
    return data as T;
  } catch (e) {
    console.error('Failed to parse JSON response', e);
    throw new Error(
      `Invalid JSON received from server: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

// --- Authentifizierungs-Endpunkte ---

export async function loginUser(
  email: string,
  password: string
): Promise<Token> {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  // Wichtig: Expliziten Typ T an handleResponse übergeben!
  return handleResponse<Token>(response);
}

export async function getCurrentUser(token: string): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserOut>(response);
}

export async function registerUser(userData: UserCreate): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse<UserOut>(response);
}

export async function joinGroup(
  token: string,
  membershipData: GroupMembershipCreate
): Promise<GroupMembership> {
  const response = await fetch(`${API_BASE_URL}/memberships/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(membershipData),
  });
  // Gibt das erstellte Membership-Objekt zurück (oder wirft ApiError bei Konflikt etc.)
  return handleResponse<GroupMembership>(response);
}

export async function getGroupMembers(
  token: string,
  groupId: number
): Promise<GroupMembership[]> {
  const response = await fetch(`${API_BASE_URL}/memberships/group/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  // Gibt Array von GroupMembership-Objekten zurück
  return handleResponse<GroupMembership[]>(response);
}

export async function joinGroupByToken(
  authToken: string,
  inviteToken: string
): Promise<GroupMembership> {
  // --- ANPASSUNG HIER ---
  // Verwende den korrekten Pfad mit dem Token als Pfadparameter.
  // Ersetze '/memberships' ggf. durch deinen tatsächlichen Router-Prefix.
  const endpointUrl = `${API_BASE_URL}/memberships/join/${encodeURIComponent(inviteToken)}`;
  // --- ENDE ANPASSUNG ---

  const response = await fetch(endpointUrl, {
    method: 'POST', // Methode ist korrekt
    headers: {
      Authorization: `Bearer ${authToken}`,
      // 'Content-Type': 'application/json', // Nicht nötig, da kein Body gesendet wird
      // Kann aber auch bleiben, stört meist nicht.
    },
    // --- ANPASSUNG HIER ---
    // Entferne den Request Body, da das Backend ihn nicht erwartet.
    // body: JSON.stringify({ token: inviteToken }), // <-- DIESE ZEILE LÖSCHEN/AUSKOMMENTIEREN
    // --- ENDE ANPASSUNG ---
  });

  // Gibt das erwartete Membership-Objekt zurück (oder wirft ApiError)
  return handleResponse<GroupMembership>(response);
}

// --- Externe Daten Endpunkte ---

export async function getUfcSchedule(): Promise<UfcEventItem[]> {
  const response = await fetch(`${API_BASE_URL}/events/external/ufc-schedule`);
  return handleResponse<UfcEventItem[]>(response);
}

export async function getBoxingSchedule(): Promise<BoxingScheduleItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/events/external/boxing-schedule`
  );
  return handleResponse<BoxingScheduleItem[]>(response);
}

// --- Gruppen- & Mitgliedschafts-Endpunkte ---

export async function getMyMemberships(
  token: string
): Promise<GroupMembership[]> {
  const response = await fetch(`${API_BASE_URL}/memberships/user/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<GroupMembership[]>(response);
}

export async function getMyGroups(token: string): Promise<Group[]> {
  const response = await fetch(`${API_BASE_URL}/groups/`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Group[]>(response);
}

export async function createGroup(
  token: string,
  groupData: GroupCreate
): Promise<Group> {
  const response = await fetch(`${API_BASE_URL}/groups/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groupData),
  });
  return handleResponse<Group>(response);
}

export async function getGroupDetails(
  token: string,
  groupId: number
): Promise<Group> {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Group>(response);
}

// --- Event- & Tipp-Endpunkte ---

export async function getGroupEvents(
  token: string,
  groupId: number
): Promise<Event[]> {
  const response = await fetch(`${API_BASE_URL}/events/group/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Event[]>(response);
}

export async function getGroupHighscore(
  token: string,
  groupId: number
): Promise<HighscoreEntry[]> {
  const response = await fetch(`${API_BASE_URL}/tips/highscore/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<HighscoreEntry[]>(response);
}

export async function createEvent(
  token: string,
  eventData: EventCreate
): Promise<Event> {
  const response = await fetch(`${API_BASE_URL}/events/`, {
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
  const response = await fetch(`${API_BASE_URL}/tips/`, {
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
  // Annahme: Backend gibt aktualisiertes Event zurück? Prüfe API-Spec, ggf. Rückgabetyp anpassen (oder void)
  const response = await fetch(`${API_BASE_URL}/events/result`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resultData),
  });
  // Annahme: Gibt das aktualisierte Event zurück ODER leeren Body (Status 200 OK)
  // Wenn Body leer sein kann:
  // if (response.status === 200 && response.headers.get('Content-Length') === '0') return null as any; // Oder spezifischer Typ
  return handleResponse<Event>(response); // Passe T an, falls Rückgabe anders ist
}
