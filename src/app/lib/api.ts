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
  TipOut, // Stelle sicher, dass dieser Typ die erwarteten Felder hat
  EventResultSet,
  // GroupMembershipCreate, // Dieser Typ wird in den Funktionen nicht direkt als Return-Typ oder Parameter verwendet
  UserTipSelection,
  AllTipsPerEvent,
  EventComment, // Der aktualisierte Typ mit Like-Infos
  EventCommentCreate,
  GroupWithOpenEvents, // Hinzugefügt, da es in einer Funktion verwendet wird
  // FootballEvent, // Wird nicht direkt in API-Funktionssignaturen verwendet, aber in MixedEvent
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail: string | object | undefined;
    try {
      const errorData = await response.json();
      errorDetail = errorData?.detail || errorData?.error || errorData?.message;
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
    return null as T; // Geeignet für void oder optionale Rückgaben
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
export async function loginUser(
  email: string,
  password: string
): Promise<Token> {
  const endpoint = `${API_BASE_URL}/api/auth/login`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<Token>(response);
}

export async function getCurrentUser(token: string): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserOut>(response);
}

export async function registerUser(userData: UserCreate): Promise<UserOut> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse<UserOut>(response);
}

// --- Gruppen- & Mitgliedschafts-Endpunkte ---
export async function createGroup(
  token: string,
  groupData: GroupCreate
): Promise<Group> {
  const response = await fetch(`${API_BASE_URL}/api/groups`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groupData),
  });
  return handleResponse<Group>(response);
}

export async function getMyGroups(token: string): Promise<Group[]> {
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
  const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<Group>(response);
}

export async function joinGroupByInviteToken(
  authToken: string,
  groupInviteToken: string
): Promise<GroupMembership> {
  const endpointUrl = `${API_BASE_URL}/api/groups/invite/${encodeURIComponent(groupInviteToken)}`;
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return handleResponse<GroupMembership>(response);
}

export async function regenerateGroupInviteToken(
  token: string,
  groupId: number
): Promise<Group> {
  const response = await fetch(
    `${API_BASE_URL}/api/groups/${groupId}/regenerate-token`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return handleResponse<Group>(response);
}

export async function addMemberToGroup(
  token: string,
  groupId: number,
  userIdToAdd: number
): Promise<GroupMembership> {
  const response = await fetch(
    `${API_BASE_URL}/api/groups/${groupId}/members`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userIdToAdd }),
    }
  );
  return handleResponse<GroupMembership>(response);
}

export async function getGroupMembers(
  token: string,
  groupId: number
): Promise<UserOut[]> {
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
  const response = await fetch(`${API_BASE_URL}/api/users/me/memberships`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<GroupMembership[]>(response);
}

// --- Externe Daten Endpunkte ---
export async function getUfcSchedule(): Promise<UfcEventItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/external/ufc-schedule`
  );
  return handleResponse<UfcEventItem[]>(response);
}

export async function getBoxingSchedule(): Promise<BoxingScheduleItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/external/boxing-schedule`
  );
  return handleResponse<BoxingScheduleItem[]>(response);
}

// --- Event- & Tipp-Endpunkte ---
export async function getGroupEvents(
  token: string,
  groupId: number
): Promise<Event[]> {
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
  const response = await fetch(
    `${API_BASE_URL}/api/tips/highscore/${groupId}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await handleResponse<{
    groupId: number;
    highscores: HighscoreEntry[];
  }>(response);
  return data.highscores;
}

export async function createEvent(
  token: string,
  eventData: EventCreate
): Promise<Event> {
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
  const response = await fetch(`${API_BASE_URL}/api/tips?groupId=${groupId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserTipSelection[]>(response);
}

export async function deleteGroup(
  token: string,
  groupId: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<void>(response); // handleResponse kümmert sich um 204
}

export async function deleteEvent(
  token: string,
  eventId: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<void>(response);
}

export async function getGroupsWithOpenEvents(
  token: string
): Promise<GroupWithOpenEvents[]> {
  const response = await fetch(`${API_BASE_URL}/api/open-events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<GroupWithOpenEvents[]>(response);
}

export async function getAllTipsForOpenGroupEvents(
  token: string,
  groupId: number
): Promise<AllTipsPerEvent> {
  const endpointUrl = `${API_BASE_URL}/api/tips/group-all?groupId=${groupId}`;
  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AllTipsPerEvent>(response);
}

export async function getMyTipsAcrossAllGroups(
  token: string
): Promise<UserTipSelection[]> {
  const response = await fetch(`${API_BASE_URL}/api/tips/all`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<UserTipSelection[]>(response);
}

// --- Event Kommentar Endpunkte (Aktualisiert und Erweitert) ---
export async function getEventComments(
  token: string,
  eventId: number
): Promise<EventComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/comments`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const comments = await handleResponse<EventComment[]>(response);
  // Stelle sicher, dass jeder Kommentar die Felder likedByCurrentUser und likesCount hat.
  // Die Backend-Route sollte dies bereits korrekt liefern.
  return comments.map((comment) => ({
    ...comment,
    likedByCurrentUser: comment.likedByCurrentUser || false, // Default falls nicht vom Backend gesendet
    likesCount: comment.likesCount || 0, // Default falls nicht vom Backend gesendet
  }));
}

export async function postEventComment(
  token: string,
  eventId: number,
  commentData: EventCommentCreate
): Promise<EventComment> {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    }
  );
  // Die Backend-Route sollte das erstellte EventComment mit initialen Like-Infos zurückgeben
  return handleResponse<EventComment>(response);
}

// NEU: Kommentar liken
export async function likeComment(
  token: string,
  commentId: number
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/comments/${commentId}/like`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return handleResponse<{ success: boolean; message?: string }>(response);
}

// NEU: Kommentar entliken
export async function unlikeComment(
  token: string,
  commentId: number
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/comments/${commentId}/like`,
    {
      // Selber Endpunkt, aber DELETE-Methode
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return handleResponse<{ success: boolean; message?: string }>(response);
}

// NEU: Kommentar löschen
export async function deleteUserComment(
  token: string,
  commentId: number
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ success: boolean; message?: string }>(response);
}

// --- Datei-Upload Endpunkt ---
interface UploadResponse {
  url: string;
}

export async function uploadImage(
  token: string,
  fileData: FormData
): Promise<UploadResponse> {
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // KEIN 'Content-Type' für FormData
    body: fileData,
  });
  return handleResponse<UploadResponse>(response);
}
