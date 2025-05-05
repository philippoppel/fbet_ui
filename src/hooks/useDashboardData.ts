// src/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getUfcSchedule,
  getBoxingSchedule,
  getMyGroups,
  getGroupDetails,
  getGroupEvents,
  getGroupHighscore,
  getGroupMembers,
  ApiError,
} from '@/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem,
  Group,
  GroupMembership,
  MixedEvent,
  Event as GroupEvent, // Alias verwenden
  HighscoreEntry,
  UserOut, // UserOut war im Original nicht verwendet, bleibt drin falls benötigt
} from '@/lib/types';

// Definiere den Rückgabetyp des Hooks
export interface UseDashboardDataReturn {
  myGroups: Group[];
  combinedEvents: MixedEvent[];
  selectedGroupId: number | null; // Ist im Interface vorhanden
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: GroupMembership[];
  loadingInitial: boolean;
  isGroupDataLoading: boolean;
  errors: {
    ufc?: string;
    boxing?: string;
    groups?: string;
    groupData?: string;
    general?: string;
  };
  handleSelectGroup: (groupId: number) => void;
  refreshSelectedGroupData: (
    groupId: number,
    showLoadingSpinner?: boolean
  ) => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { token, user, isLoading: isAuthLoading } = useAuth();

  // --- States ---
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] =
    useState<Group | null>(null);
  const [selectedGroupEvents, setSelectedGroupEvents] = useState<GroupEvent[]>(
    []
  );
  const [selectedGroupHighscore, setSelectedGroupHighscore] = useState<
    HighscoreEntry[]
  >([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<
    GroupMembership[]
  >([]);
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

  // --- Funktion zum Laden der Daten der ausgewählten Gruppe (Überarbeitet) ---
  const loadSelectedGroupData = useCallback(
    async (groupId: number, showLoadingSpinner = true) => {
      if (!token) {
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        setIsGroupDataLoading(false);
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        return;
      }

      if (showLoadingSpinner) setIsGroupDataLoading(true);
      setErrors((prev) => ({ ...prev, groupData: undefined })); // Fehler zurücksetzen

      // States *vor* dem Fetch zurücksetzen
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);

      let fetchErrorOccurred = false; // Flag für Fehler bei Promises

      try {
        const results = await Promise.allSettled([
          getGroupDetails(token, groupId),
          getGroupEvents(token, groupId),
          getGroupHighscore(token, groupId),
          getGroupMembers(token, groupId),
        ]);

        // Verarbeite Ergebnisse direkt, ohne Error zu werfen
        if (results[0].status === 'fulfilled') {
          setSelectedGroupDetails(results[0].value);
        } else {
          console.error('Failed Detail Load:', results[0].reason);
          fetchErrorOccurred = true;
        }

        if (results[1].status === 'fulfilled') {
          setSelectedGroupEvents(results[1].value);
        } else {
          console.error('Failed Event Load:', results[1].reason);
          fetchErrorOccurred = true;
        }

        if (results[2].status === 'fulfilled') {
          setSelectedGroupHighscore(results[2].value);
        } else {
          console.error('Failed Highscore Load:', results[2].reason);
          fetchErrorOccurred = true;
        }

        if (results[3].status === 'fulfilled') {
          setSelectedGroupMembers(results[3].value);
        } else {
          console.error('Failed Members Load:', results[3].reason);
          fetchErrorOccurred = true;
        }

        // Setze Fehler im State, wenn *irgendein* Promise fehlgeschlagen ist
        if (fetchErrorOccurred) {
          // Finde den ersten Fehler für eine etwas spezifischere Nachricht (optional)
          const firstRejected = results.find((r) => r.status === 'rejected');
          let errorMessage =
            'Teile der Gruppendaten konnten nicht geladen werden.';
          if (firstRejected && firstRejected.reason instanceof ApiError) {
            errorMessage = `${firstRejected.reason.status}: ${firstRejected.reason.detail || firstRejected.reason.message || 'API Fehler'}`;
          } else if (firstRejected && firstRejected.reason instanceof Error) {
            errorMessage = firstRejected.reason.message;
          }
          setErrors((prev) => ({ ...prev, groupData: errorMessage }));
          // Wichtig: Die States werden bei Fehler nicht automatisch zurückgesetzt,
          // da manche Daten ja erfolgreich geladen worden sein könnten.
          // Das Zurücksetzen passiert oben *vor* dem Fetch.
        }
      } catch (err: any) {
        // Fängt nur noch Fehler außerhalb von Promise.allSettled oder falls allSettled selbst fehlschlägt
        console.error('Unexpected error in loadSelectedGroupData:', err);
        let message = 'Unerwarteter Fehler beim Laden der Gruppendaten.';
        if (err instanceof ApiError) {
          // Sollte hier eigentlich nicht landen
          message = `${err.status}: ${err.detail || err.message || 'API Fehler'}`;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setErrors((prev) => ({ ...prev, groupData: message }));
        // Hier sicherheitshalber auch resetten
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
      } finally {
        if (showLoadingSpinner) setIsGroupDataLoading(false);
      }
    },
    [token] // Abhängigkeit nur von token
  );

  // --- Initiales Datenladen (Überarbeitet) ---
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const loadInitialData = async () => {
      if (!token || !user) {
        setLoadingInitial(false);
        setMyGroups([]);
        setUfcEvents([]);
        setBoxingEvents([]);
        setSelectedGroupId(null); // Wichtig bei Logout/kein Login
        // Sicherstellen, dass auch Detail-States leer sind
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        return;
      }

      setLoadingInitial(true);
      setErrors({});

      let groups: Group[] = [];
      try {
        const fetchedGroups = await getMyGroups(token);
        groups = Array.from(
          new Map(fetchedGroups.map((g) => [g.id, g])).values()
        );
        setMyGroups(groups);
      } catch (groupError: any) {
        console.error('Groups Load Failed:', groupError);
        setErrors((p) => ({
          ...p,
          groups: groupError.message || 'Gruppen Ladefehler',
        }));
        setSelectedGroupId(null); // Bei Gruppenfehler keine Gruppe auswählen
      }

      // Wähle erste Gruppe automatisch aus, NUR wenn noch keine ausgewählt ist
      // Dies passiert nur einmal initial oder nach erneutem Login.
      if (groups.length > 0 && selectedGroupId === null) {
        setSelectedGroupId(groups[0].id);
        // Daten für diese Gruppe werden durch den anderen useEffect geladen
      } else if (groups.length === 0) {
        setSelectedGroupId(null);
      }
      // Wenn selectedGroupId schon gesetzt war, nicht überschreiben.

      // Lade externe Events parallel
      try {
        const [ufcResult, boxingResult] = await Promise.allSettled([
          getUfcSchedule(),
          getBoxingSchedule(),
        ]);

        if (ufcResult.status === 'fulfilled') {
          setUfcEvents(ufcResult.value);
        } else {
          console.error('UFC Load Failed:', ufcResult.reason);
          setErrors((p) => ({ ...p, ufc: 'UFC Ladefehler' }));
        }

        if (boxingResult.status === 'fulfilled') {
          setBoxingEvents(boxingResult.value);
        } else {
          console.error('Boxing Load Failed:', boxingResult.reason);
          setErrors((p) => ({ ...p, boxing: 'Box Ladefehler' }));
        }
      } catch (eventError) {
        console.error('Error loading external events:', eventError);
        setErrors((p) => ({
          ...p,
          general: 'Fehler beim Laden externer Events.',
        }));
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
    // Die Abhängigkeiten sind korrekt für den Zweck des initialen Ladens bei Auth-Änderung.
    // selectedGroupId wird hier gelesen, soll aber keine Abhängigkeit sein.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isAuthLoading]);

  // --- Effekt zum Laden der Gruppendaten bei Änderung der selectedGroupId ---
  useEffect(() => {
    // Nur ausführen, wenn eine ID ausgewählt ist UND der Token vorhanden ist
    if (selectedGroupId !== null && token) {
      loadSelectedGroupData(selectedGroupId, true); // Ruft überarbeitete Funktion auf
    } else if (selectedGroupId === null) {
      // Explizit States zurücksetzen, wenn keine Gruppe ausgewählt ist
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setIsGroupDataLoading(false);
      setErrors((prev) => ({ ...prev, groupData: undefined })); // Gruppenspezifischen Fehler löschen
    }
    // Abhängigkeiten sind korrekt, loadSelectedGroupData ist stabil dank useCallback.
  }, [selectedGroupId, token, loadSelectedGroupData]);

  // --- Handler für Gruppenwechsel ---
  const handleSelectGroup = useCallback(
    (groupId: number) => {
      // Verhindere unnötiges Neusetzen und Neuladen, wenn die Gruppe schon ausgewählt ist
      if (groupId !== selectedGroupId) {
        setSelectedGroupId(groupId);
        // Der obige useEffect reagiert auf die Änderung von selectedGroupId
      }
    },
    [selectedGroupId]
  ); // Füge selectedGroupId als Abhängigkeit hinzu, damit der Check aktuell ist

  // --- Hilfsfunktion zum Parsen von Daten (Verbessert) ---
  const parseDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date(0); // Handle null/undefined/empty string

    try {
      const isoParsed = new Date(dateStr); // Versucht ISO 8601
      if (!isNaN(isoParsed.getTime())) return isoParsed;
    } catch (e) {
      /* Ignorieren */
    }

    const now = new Date();
    const year = now.getFullYear();
    let processedDateStr = dateStr;
    const monthDayMatch = dateStr.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i
    );
    if (monthDayMatch) {
      processedDateStr = `${dateStr}, ${year}`;
    }
    // Hier könnten weitere Fallbacks für deine spezifischen Formate hin

    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /* Ignorieren */
    }

    console.warn(`Could not parse date string: "${dateStr}". Returning epoch.`);
    return new Date(0);
  };

  // --- combinedEvents Berechnung (Verbessert) ---
  const combinedEvents: MixedEvent[] = useMemo(() => {
    const ufcMapped = ufcEvents.map((e, i) => ({
      id: e.uid || `${e.summary?.replace(/\s+/g, '-')}-${e.dtstart || i}`,
      title: e.summary || 'Unbekanntes UFC Event',
      subtitle: `${e.dtstart && parseDate(e.dtstart).getFullYear() > 1970 ? parseDate(e.dtstart).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
      sport: 'ufc' as const,
      date: parseDate(e.dtstart),
      original: e,
    }));

    const boxingMapped = boxingEvents.map((e, i) => {
      const parsedDate = parseDate(e.date);
      const stableId =
        e.details?.substring(0, 50).replace(/\s+/g, '-') || `boxing-${i}`;
      return {
        id: stableId,
        title: e.details || 'Unbekannter Boxkampf',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleDateString('de-DE', { dateStyle: 'short' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
        sport: 'boxing' as const,
        date: parsedDate,
        original: e,
      };
    });

    // Filtere Events mit ungültigem Datum (Epoch = 1970) heraus
    const validEvents = [...ufcMapped, ...boxingMapped].filter(
      (event) => event.date.getFullYear() > 1970
    );

    return validEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents]);

  // --- Rückgabewert des Hooks ---
  return {
    myGroups,
    combinedEvents,
    selectedGroupId, // Wird zurückgegeben
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup, // Jetzt mit useCallback und Abhängigkeit
    refreshSelectedGroupData: loadSelectedGroupData,
  };
}
