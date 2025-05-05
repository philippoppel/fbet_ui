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
  getGroupMembers, // <-- Importiert
  ApiError,
} from '@/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem,
  Group,
  GroupMembership, // <-- Importiert
  MixedEvent,
  Event as GroupEvent,
  HighscoreEntry,
} from '@/lib/types';

// Definiere den Rückgabetyp des Hooks
export interface UseDashboardDataReturn {
  myGroups: Group[];
  combinedEvents: MixedEvent[];
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: GroupMembership[]; // <-- Hinzugefügt
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
  const { token, user, isLoading: isAuthLoading } = useAuth(); // isAuthLoading hinzugefügt

  // --- States ---
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({}); // Vereinfachter Typ
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
  >([]); // <-- Initialisiert
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

  // --- Funktion zum Laden der Daten der ausgewählten Gruppe ---
  const loadSelectedGroupData = useCallback(
    async (groupId: number, showLoadingSpinner = true) => {
      // Token-Prüfung am Anfang
      if (!token) {
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        setIsGroupDataLoading(false); // Sicherstellen, dass Ladezustand beendet wird
        // Reset states
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        return;
      }

      if (showLoadingSpinner) setIsGroupDataLoading(true);
      setErrors((prev) => ({ ...prev, groupData: undefined })); // Fehler für neue Gruppe zurücksetzen

      // Reset states for the new group *before* fetching
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);

      try {
        // Lade alle Daten parallel
        const results = await Promise.allSettled([
          getGroupDetails(token, groupId),
          getGroupEvents(token, groupId),
          getGroupHighscore(token, groupId),
          getGroupMembers(token, groupId), // <-- Mitglieder laden
        ]);

        let groupDataErrorOccurred = false;
        let firstErrorMessage = 'Fehler beim Laden der Gruppendaten.'; // Default Fehlermeldung

        // Verarbeite Details
        if (results[0].status === 'fulfilled') {
          setSelectedGroupDetails(results[0].value);
        } else {
          console.error('Failed Detail Load:', results[0].reason);
          groupDataErrorOccurred = true;
          firstErrorMessage =
            results[0].reason instanceof Error
              ? results[0].reason.message
              : firstErrorMessage;
        }

        // Verarbeite Events
        if (results[1].status === 'fulfilled') {
          setSelectedGroupEvents(results[1].value);
        } else {
          console.error('Failed Event Load:', results[1].reason);
          if (!groupDataErrorOccurred)
            firstErrorMessage =
              results[1].reason instanceof Error
                ? results[1].reason.message
                : firstErrorMessage;
          groupDataErrorOccurred = true;
        }

        // Verarbeite Highscore
        if (results[2].status === 'fulfilled') {
          setSelectedGroupHighscore(results[2].value);
        } else {
          console.error('Failed Highscore Load:', results[2].reason);
          if (!groupDataErrorOccurred)
            firstErrorMessage =
              results[2].reason instanceof Error
                ? results[2].reason.message
                : firstErrorMessage;
          groupDataErrorOccurred = true;
        }

        // Verarbeite Members <-- NEU
        if (results[3].status === 'fulfilled') {
          setSelectedGroupMembers(results[3].value);
        } else {
          console.error('Failed Members Load:', results[3].reason);
          if (!groupDataErrorOccurred)
            firstErrorMessage =
              results[3].reason instanceof Error
                ? results[3].reason.message
                : firstErrorMessage;
        }
      } catch (err: any) {
        console.error('Error loading selected group data (catch block):', err);
        let message = 'Fehler beim Laden der Gruppendaten.';
        if (err instanceof ApiError) {
          message = `${err.status}: ${err.detail || err.message || 'API Fehler'}`;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setErrors((prev) => ({ ...prev, groupData: message }));
        // Sicherstellen, dass bei Fehler alles leer ist
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

  // --- Initiales Datenladen ---
  useEffect(() => {
    // Warten bis Auth-Status klar ist
    if (isAuthLoading) {
      return;
    }

    const loadInitialData = async () => {
      // Nur ausführen, wenn Token da ist
      if (!token || !user) {
        setLoadingInitial(false); // Kein Token -> Ladevorgang beendet
        setMyGroups([]); // Keine Gruppen ohne Login
        setUfcEvents([]);
        setBoxingEvents([]);
        return;
      }

      setLoadingInitial(true); // Beginne initiales Laden
      setErrors({}); // Fehler zurücksetzen

      try {
        // Gruppen zuerst, da sie für die Auswahl wichtig sind
        let groups: Group[] = [];
        try {
          const fetchedGroups = await getMyGroups(token);
          // Deduplizieren falls nötig (Map-Trick ist gut)
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
        }

        // Wähle erste Gruppe automatisch aus, wenn noch keine ausgewählt ist und Gruppen existieren
        if (groups.length > 0 && selectedGroupId === null) {
          setSelectedGroupId(groups[0].id);
        } else if (groups.length === 0) {
          setSelectedGroupId(null); // Keine Gruppen -> keine Auswahl
        }

        // Lade externe Events parallel (weniger kritisch)
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
      } catch (err) {
        console.error('Critical error during initial load:', err);
        setErrors((p) => ({ ...p, general: 'Kritischer Ladefehler.' }));
      } finally {
        setLoadingInitial(false); // Initiales Laden immer beenden
      }
    };

    loadInitialData();
  }, [token, user, isAuthLoading]); // Abhängig von Auth-Status und Token/User

  // --- Effekt zum Laden der Gruppendaten bei Änderung der selectedGroupId ---
  useEffect(() => {
    // Nur ausführen, wenn eine ID ausgewählt ist UND der Token vorhanden ist
    if (selectedGroupId !== null && token) {
      loadSelectedGroupData(selectedGroupId, true);
    } else {
      // Reset states if no group is selected or token is missing
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]); // <-- Reset
      setIsGroupDataLoading(false); // Sicherstellen, dass Ladeanzeige aus ist
      // Optional: setErrors((prev) => ({ ...prev, groupData: undefined })); // Gruppenspezifischen Fehler löschen?
    }
    // Die Abhängigkeit von loadSelectedGroupData ist wichtig, da sie sich mit dem Token ändert!
  }, [selectedGroupId, token, loadSelectedGroupData]);

  // --- Handler für Gruppenwechsel ---
  const handleSelectGroup = (groupId: number) => {
    if (groupId !== selectedGroupId) {
      setSelectedGroupId(groupId);
      // Beim Wechsel wird der obere useEffect getriggert und lädt die Daten neu
    }
  };

  // --- combinedEvents Berechnung ---
  const parseDate = (dateStr: string): Date => {
    // ... (Implementierung bleibt gleich) ...
    const now = new Date();
    const hasYear = /\d{4}/.test(dateStr);
    const fixedDate = hasYear ? dateStr : `${dateStr} ${now.getFullYear()}`;
    try {
      // Versuche, direkt mit dem ISO-Format zu parsen, wenn möglich
      const isoParsed = new Date(dateStr);
      if (!isNaN(isoParsed.getTime())) return isoParsed;
    } catch (e) {
      /* Ignorieren, Fallback versuchen */
    }

    const parsed = new Date(fixedDate);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed; // Invalid date -> 1970
  };

  const combinedEvents: MixedEvent[] = useMemo(() => {
    const ufcMapped = ufcEvents.map((e, i) => ({
      id: e.uid || `ufc-${i}`,
      title: e.summary || 'Unbekanntes UFC Event',
      subtitle: `${e.dtstart ? new Date(e.dtstart).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
      sport: 'ufc' as const,
      date: e.dtstart ? parseDate(e.dtstart) : new Date(0),
      original: e,
    }));

    const boxingMapped = boxingEvents.map((e, i) => {
      const parsedDate = parseDate(e.date || '');
      return {
        id: e.details || `boxing-${i}`,
        title: e.details || 'Unbekannter Boxkampf',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleDateString('de-DE', { dateStyle: 'short' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
        sport: 'boxing' as const,
        date: parsedDate,
        original: e,
      };
    });

    return [...ufcMapped, ...boxingMapped].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [ufcEvents, boxingEvents]);

  // --- Rückgabewert des Hooks ---
  return {
    myGroups,
    combinedEvents,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers, // <-- Zurückgeben
    loadingInitial,
    isGroupDataLoading,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData: loadSelectedGroupData,
  };
}
