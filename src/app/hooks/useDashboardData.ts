// src/app/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getUfcSchedule,
  getBoxingSchedule,
  getMyGroups as apiGetMyGroups, // Umbenannt zur Unterscheidung
  getGroupDetails,
  getGroupEvents,
  getGroupHighscore,
  getGroupMembers,
  getMyTipsForGroup,
  ApiError,
} from '@/app/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem,
  Group,
  MixedEvent, // Typ für kombinierte externe Events
  Event as GroupEvent, // Typ für Gruppen-interne Events
  HighscoreEntry,
  UserOut,
  UserTipSelection,
} from '@/app/lib/types';

// Interface für Optionen beim Laden von Gruppendaten
export interface LoadGroupDataOptions {
  showLoadingSpinner?: boolean; // Soll der globale Ladeindikator angezeigt werden?
  keepExistingDetailsWhileRefreshingSubData?: boolean; // Sollen Details beim Soft-Refresh behalten werden?
}

// Interface für den Rückgabewert des Hooks
export interface UseDashboardDataReturn {
  myGroups: Group[]; // Liste der Gruppen des Benutzers
  retrievedCombinedEvents: MixedEvent[]; // Kombinierte und sortierte Liste externer Events (UFC, Boxen)
  selectedGroupId: number | null; // ID der aktuell ausgewählten Gruppe
  selectedGroupDetails: Group | null; // Details der ausgewählten Gruppe
  selectedGroupEvents: GroupEvent[]; // Interne Events der ausgewählten Gruppe
  selectedGroupHighscore: HighscoreEntry[]; // Highscore-Liste der ausgewählten Gruppe
  selectedGroupMembers: UserOut[]; // Mitgliederliste der ausgewählten Gruppe
  userSubmittedTips: Record<number, string>; // Abgegebene Tipps des Benutzers (eventId: selectedOption)
  loadingInitial: boolean; // Zeigt an, ob der Hook initial lädt (hauptsächlich Gruppenliste)
  isGroupDataLoading: boolean; // Zeigt an, ob Daten für die ausgewählte Gruppe geladen werden
  isLoadingCombinedEvents: boolean; // Zeigt an, ob externe Events geladen werden
  errors: {
    // Objekt zur Speicherung von Fehlermeldungen
    ufc?: string;
    boxing?: string;
    groups?: string;
    groupData?: string;
    general?: string;
    userTips?: string;
    combinedEvents?: string;
  };
  handleSelectGroup: (groupId: number | null) => void; // Funktion zum Auswählen einer Gruppe
  refreshSelectedGroupData: (
    // Funktion zum Neuladen der Daten der ausgewählten Gruppe
    groupId: number,
    options?: LoadGroupDataOptions
  ) => Promise<void>;
  updateUserTipState: (eventId: number, selectedOption: string) => void; // Für optimistisches Tipp-Update
  loadCombinedEvents: () => Promise<void>; // Funktion zum Laden der externen Events
  refreshMyGroups: () => Promise<Group[]>; // Funktion zum expliziten Neuladen der Gruppenliste
}

// Der Custom Hook
export function useDashboardData(): UseDashboardDataReturn {
  // --- Authentifizierungskontext ---
  const { token, user, isLoading: isAuthLoading } = useAuth();

  // --- Lokale States ---
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<UseDashboardDataReturn['errors']>({});
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] =
    useState<Group | null>(null);
  const [selectedGroupEvents, setSelectedGroupEvents] = useState<GroupEvent[]>(
    []
  );
  const [selectedGroupHighscore, setSelectedGroupHighscore] = useState<
    HighscoreEntry[]
  >([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<UserOut[]>(
    []
  );
  const [userSubmittedTips, setUserSubmittedTips] = useState<
    Record<number, string>
  >({});
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);
  const [isLoadingCombinedEvents, setIsLoadingCombinedEvents] = useState(false);
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]); // Rohdaten UFC
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]); // Rohdaten Boxen

  // Ref für Gruppendetails, um useCallback-Abhängigkeiten zu reduzieren
  const groupDetailsRef = useRef<Group | null>(null);
  useEffect(() => {
    groupDetailsRef.current = selectedGroupDetails;
  }, [selectedGroupDetails]);

  // --- Kernfunktionen ---

  // Optimistisches Update für abgegebene Tipps im UI
  const updateUserTipState = useCallback(
    (eventId: number, selectedOption: string) => {
      setUserSubmittedTips((prevTips) => ({
        ...prevTips,
        [eventId]: selectedOption,
      }));
    },
    []
  );

  // Holt die Gruppenliste des Benutzers vom Server
  const fetchMyGroups = useCallback(async (): Promise<Group[]> => {
    // console.log("[useDashboardData] fetchMyGroups called"); // DEBUG
    if (!token || !user) {
      setMyGroups([]); // Bei fehlender Auth leere Liste setzen
      return [];
    }
    setErrors((prev) => ({ ...prev, groups: undefined })); // Fehler zurücksetzen
    try {
      const fetchedGroups = await apiGetMyGroups(token);
      // Deduplizieren für den Fall, dass die API doppelte Einträge liefert
      const uniqueGroups = Array.from(
        new Map(fetchedGroups.map((g) => [g.id, g])).values()
      );
      setMyGroups(uniqueGroups);
      // console.log("[useDashboardData] fetchMyGroups success", uniqueGroups.length); // DEBUG
      return uniqueGroups; // Gibt die Liste zurück
    } catch (groupError: any) {
      console.error(
        '[useDashboardData] fetchMyGroups Load Failed:',
        groupError
      );
      setErrors((p) => ({
        ...p,
        groups: groupError.message || 'Fehler beim Laden der Gruppen.',
      }));
      setMyGroups([]); // Bei Fehler leeren
      return [];
    }
  }, [token, user]); // Abhängig von token und user

  // Lädt alle relevanten Daten für eine spezifische, ausgewählte Gruppe
  const loadSelectedGroupData = useCallback(
    async (groupId: number, options?: LoadGroupDataOptions) => {
      const {
        showLoadingSpinner = true, // Standardmäßig Ladeindikator zeigen
        keepExistingDetailsWhileRefreshingSubData = false, // Standardmäßig harter Refresh
      } = options || {};

      const loadingOperationId = Date.now(); // Eindeutige ID für diesen Ladevorgang
      console.log(
        `[useDashboardData - ${loadingOperationId}] loadSelectedGroupData START for groupId: ${groupId}, keepExisting: ${keepExistingDetailsWhileRefreshingSubData}, showSpinner: ${showLoadingSpinner}`
      ); // DEBUG

      if (!token) {
        console.log(
          `[useDashboardData - ${loadingOperationId}] No token, aborting.`
        ); // DEBUG
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        setIsGroupDataLoading(false); // Sicherstellen, dass Ladezustand aus ist
        // Alle relevanten States zurücksetzen
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        return;
      }

      let wasLoadingSet = false; // Flag, um zu verfolgen, ob der Spinner aktiviert wurde
      // Ladezustand nur bei hartem Refresh setzen
      if (!keepExistingDetailsWhileRefreshingSubData && showLoadingSpinner) {
        console.log(
          `[useDashboardData - ${loadingOperationId}] Setting isGroupDataLoading = true`
        ); // DEBUG
        setIsGroupDataLoading(true);
        wasLoadingSet = true;
      }
      // Relevante Fehler zurücksetzen
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
      }));

      // Aktuelle Details aus Ref lesen (vermeidet Abhängigkeit von State in useCallback)
      const currentGroupDetailsFromState = groupDetailsRef.current;
      let shouldFetchDetails = true;
      let initialDetailsForPromise: Group | null = null;

      // Entscheiden, ob Details neu geladen werden müssen oder beibehalten werden können
      if (
        keepExistingDetailsWhileRefreshingSubData &&
        currentGroupDetailsFromState &&
        currentGroupDetailsFromState.id === groupId
      ) {
        shouldFetchDetails = false;
        initialDetailsForPromise = currentGroupDetailsFromState;
        console.log(
          `[useDashboardData - ${loadingOperationId}] Keeping existing details.`
        ); // DEBUG
      } else {
        console.log(
          `[useDashboardData - ${loadingOperationId}] Resetting details (shouldFetchDetails=${shouldFetchDetails}).`
        ); // DEBUG
        // Bei Gruppenwechsel oder hartem Refresh Details zurücksetzen
        setSelectedGroupDetails(null);
      }

      // Listen nur bei hartem Refresh sofort leeren (verhindert Flackern bei Soft-Refresh)
      if (!keepExistingDetailsWhileRefreshingSubData) {
        console.log(
          `[useDashboardData - ${loadingOperationId}] Resetting lists (Events, Highscore, Members, Tips).`
        ); // DEBUG
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
      }

      // API-Aufrufe vorbereiten (Details optional, Rest immer)
      const promisesToFetch: Promise<any>[] = [];
      if (shouldFetchDetails)
        promisesToFetch.push(getGroupDetails(token, groupId));
      else promisesToFetch.push(Promise.resolve(initialDetailsForPromise)); // Vorhandene Details verwenden
      promisesToFetch.push(getGroupEvents(token, groupId));
      promisesToFetch.push(getGroupHighscore(token, groupId));
      promisesToFetch.push(getGroupMembers(token, groupId));
      promisesToFetch.push(getMyTipsForGroup(token, groupId));

      console.log(
        `[useDashboardData - ${loadingOperationId}] Starting ${promisesToFetch.length} API calls.`
      ); // DEBUG
      let fetchErrorOccurredForCoreData = false; // Flag für Fehler bei kritischen Daten

      try {
        // Alle Anfragen parallel ausführen und auf alle warten (settled)
        const results = await Promise.allSettled(promisesToFetch);
        console.log(
          `[useDashboardData - ${loadingOperationId}] API calls finished. Processing results.`
        ); // DEBUG
        const [detailsRes, eventsRes, highscoreRes, membersRes, tipsRes] =
          results;

        // Ergebnisse verarbeiten und States setzen (mit Logging für Fehler)
        if (detailsRes.status === 'fulfilled')
          setSelectedGroupDetails(detailsRes.value as Group | null);
        else if (shouldFetchDetails) {
          console.error(
            `[useDashboardData - ${loadingOperationId}] Failed details:`,
            detailsRes.reason
          );
          fetchErrorOccurredForCoreData = true;
        }

        if (eventsRes.status === 'fulfilled')
          setSelectedGroupEvents(eventsRes.value as GroupEvent[]);
        else {
          console.error(
            `[useDashboardData - ${loadingOperationId}] Failed events:`,
            eventsRes.reason
          );
          fetchErrorOccurredForCoreData = true;
        }

        if (highscoreRes.status === 'fulfilled')
          setSelectedGroupHighscore(highscoreRes.value as HighscoreEntry[]);
        else {
          console.error(
            `[useDashboardData - ${loadingOperationId}] Failed highscore:`,
            highscoreRes.reason
          );
          fetchErrorOccurredForCoreData = true;
        }

        if (membersRes.status === 'fulfilled')
          setSelectedGroupMembers(membersRes.value as UserOut[]);
        else {
          console.error(
            `[useDashboardData - ${loadingOperationId}] Failed members:`,
            membersRes.reason
          );
          fetchErrorOccurredForCoreData = true;
        }

        if (tipsRes.status === 'fulfilled') {
          const tipsArray = (tipsRes.value as UserTipSelection[]) ?? [];
          const tipsRecord: Record<number, string> = {};
          tipsArray.forEach((tip) => {
            if (
              tip &&
              typeof tip.eventId === 'number' &&
              typeof tip.selectedOption === 'string'
            )
              tipsRecord[tip.eventId] = tip.selectedOption;
          });
          setUserSubmittedTips(tipsRecord);
        } else {
          console.error(
            `[useDashboardData - ${loadingOperationId}] Failed tips:`,
            tipsRes.reason
          );
          setErrors((prev) => ({
            ...prev,
            userTips:
              (tipsRes.reason as Error)?.message ||
              'Tipps konnten nicht geladen werden.',
          }));
        }

        // Gesamtfehler für Gruppendaten setzen, wenn einer der Kern-API-Aufrufe fehlgeschlagen ist
        if (fetchErrorOccurredForCoreData) {
          const coreResults = shouldFetchDetails
            ? [detailsRes, eventsRes, highscoreRes, membersRes]
            : [eventsRes, highscoreRes, membersRes];
          const firstRejected = coreResults.find(
            (r) => r.status === 'rejected'
          );
          let errorMessage =
            'Teile der Gruppendaten konnten nicht geladen werden.';
          if (firstRejected?.status === 'rejected') {
            const reason = firstRejected.reason;
            if (reason instanceof ApiError)
              errorMessage = `${reason.status}: ${reason.detail || reason.message || 'API Fehler'}`;
            else if (reason instanceof Error) errorMessage = reason.message;
            else errorMessage = 'Unbekannter Fehler beim Laden der Kerndaten.';
          }
          console.log(
            `[useDashboardData - ${loadingOperationId}] Setting groupData error: ${errorMessage}`
          ); // DEBUG
          setErrors((prev) => ({ ...prev, groupData: errorMessage }));
        } else {
          console.log(
            `[useDashboardData - ${loadingOperationId}] All core data fetched successfully (or kept).`
          ); // DEBUG
        }
      } catch (err: any) {
        // Unerwarteter Fehler im Promise.allSettled Wrapper
        console.error(
          `[useDashboardData - ${loadingOperationId}] CRITICAL: Unexpected error in loadSelectedGroupData wrapper:`,
          err
        ); // DEBUG
        setErrors((prev) => ({
          ...prev,
          groupData: 'Unerwarteter Systemfehler.',
        }));
        // Sicherheitshalber States zurücksetzen
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
      } finally {
        // WICHTIG: Ladezustand *immer* beenden, wenn er aktiviert wurde
        if (wasLoadingSet) {
          console.log(
            `[useDashboardData - ${loadingOperationId}] Setting isGroupDataLoading = false in finally block.`
          ); // DEBUG
          setIsGroupDataLoading(false);
        } else {
          console.log(
            `[useDashboardData - ${loadingOperationId}] isGroupDataLoading was not set, skipping reset.`
          ); // DEBUG
        }
        console.log(
          `[useDashboardData - ${loadingOperationId}] loadSelectedGroupData END for groupId: ${groupId}`
        ); // DEBUG
      }
    },
    [token]
  ); // Nur `token` als stabile Abhängigkeit

  // --- UseEffects für Datenabrufe ---

  // Initiales Laden der Gruppenliste, wenn Auth abgeschlossen ist
  useEffect(() => {
    if (isAuthLoading) return; // Warten bis Authentifizierung fertig

    const loadInitialDashboardData = async () => {
      console.log('[useDashboardData] Initial load START'); // DEBUG
      setLoadingInitial(true);
      let currentGroups: Group[] = [];
      if (token && user) {
        currentGroups = await fetchMyGroups(); // Zentrale Funktion nutzen
      } else {
        setMyGroups([]);
        setSelectedGroupId(null);
        setSelectedGroupDetails(null);
      }
      // Erste Gruppe auswählen, wenn keine ausgewählt ist und Gruppen vorhanden sind
      if (currentGroups.length > 0 && selectedGroupId === null) {
        console.log(
          '[useDashboardData] Initial load: Selecting first group',
          currentGroups[0].id
        ); // DEBUG
        setSelectedGroupId(currentGroups[0].id);
      } else if (currentGroups.length === 0) {
        console.log(
          '[useDashboardData] Initial load: No groups found, setting selectedGroupId to null'
        ); // DEBUG
        setSelectedGroupId(null); // Keine Gruppen -> keine Auswahl
      }
      setLoadingInitial(false);
      console.log('[useDashboardData] Initial load END'); // DEBUG
    };

    loadInitialDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isAuthLoading, fetchMyGroups]); // fetchMyGroups ist stabil, selectedGroupId bewusst weggelassen, um Re-Fetch bei Auswahl zu vermeiden

  // Laden der spezifischen Gruppendaten, wenn sich die Auswahl (selectedGroupId) oder der Token ändert
  useEffect(() => {
    console.log(
      `[useDashboardData] useEffect for selectedGroupId change: ${selectedGroupId}`
    ); // DEBUG
    if (selectedGroupId !== null && token) {
      console.log(
        `[useDashboardData] Triggering loadSelectedGroupData for ${selectedGroupId}`
      ); // DEBUG
      // Harter Refresh beim Gruppenwechsel oder Token-Änderung
      loadSelectedGroupData(selectedGroupId, {
        showLoadingSpinner: true,
        keepExistingDetailsWhileRefreshingSubData: false,
      });
    } else if (selectedGroupId === null) {
      console.log(
        '[useDashboardData] selectedGroupId is null, resetting details.'
      ); // DEBUG
      // Auswahl aufgehoben, relevante States zurücksetzen
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setUserSubmittedTips({});
      if (isGroupDataLoading) {
        console.log(
          '[useDashboardData] Resetting isGroupDataLoading because selectedGroupId is null.'
        ); // DEBUG
        setIsGroupDataLoading(false); // Ladezustand beenden
      }
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
      }));
    }
  }, [selectedGroupId, token, loadSelectedGroupData]); // loadSelectedGroupData ist stabil

  // --- Handler-Funktionen ---

  // Setzt die ID der ausgewählten Gruppe
  const handleSelectGroup = useCallback(
    (groupId: number | null) => {
      console.log(
        `[useDashboardData] handleSelectGroup called with: ${groupId}`
      ); // DEBUG
      if (groupId !== selectedGroupId) {
        // Nur ändern, wenn die ID neu ist
        setSelectedGroupId(groupId);
      } else {
        console.log(
          `[useDashboardData] handleSelectGroup: groupId ${groupId} is already selected.`
        ); // DEBUG
      }
    },
    [selectedGroupId]
  ); // Abhängig vom aktuellen selectedGroupId

  // Lädt externe Event-Daten (UFC, Boxen)
  const loadCombinedEvents = useCallback(async () => {
    if (
      (ufcEvents.length > 0 || boxingEvents.length > 0) &&
      !isLoadingCombinedEvents
    )
      return; // Nicht neu laden, wenn schon vorhanden
    if (isLoadingCombinedEvents) return; // Nicht laden, wenn schon ein Ladevorgang läuft
    setIsLoadingCombinedEvents(true);
    setErrors((prev) => ({
      ...prev,
      ufc: undefined,
      boxing: undefined,
      combinedEvents: undefined,
    }));
    try {
      const [ufcResult, boxingResult] = await Promise.allSettled([
        getUfcSchedule(),
        getBoxingSchedule(),
      ]);
      if (ufcResult.status === 'fulfilled') setUfcEvents(ufcResult.value);
      else {
        console.error('UFC Load Failed:', ufcResult.reason);
        setErrors((p) => ({
          ...p,
          ufc: (ufcResult.reason as Error)?.message || 'UFC Ladefehler',
        }));
      }
      if (boxingResult.status === 'fulfilled')
        setBoxingEvents(boxingResult.value);
      else {
        console.error('Boxing Load Failed:', boxingResult.reason);
        setErrors((p) => ({
          ...p,
          boxing: (boxingResult.reason as Error)?.message || 'Box Ladefehler',
        }));
      }
      if (ufcResult.status === 'rejected' || boxingResult.status === 'rejected')
        setErrors((p) => ({
          ...p,
          combinedEvents:
            'Teile der externen Events konnten nicht geladen werden.',
        }));
    } catch (eventError: any) {
      console.error('Error loading external events:', eventError);
      setErrors((p) => ({
        ...p,
        combinedEvents:
          eventError.message || 'Fehler beim Laden externer Events.',
      }));
    } finally {
      setIsLoadingCombinedEvents(false);
    }
  }, [ufcEvents.length, boxingEvents.length, isLoadingCombinedEvents]); // Abhängigkeiten für Neu-Lade-Logik

  // --- Hilfsfunktionen ---

  // Versucht, verschiedene Datumsformate zu parsen
  const parseDate = useCallback((dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date(0); // Rückgabe Epoch bei ungültigem Input
    try {
      // Versuch 1: Standard ISO/RFC Formate
      const parsedTimestamp = Date.parse(dateStr);
      if (!isNaN(parsedTimestamp)) return new Date(parsedTimestamp);
    } catch (e) {
      /* Ignorieren */
    }

    // Versuch 2: Englische Formate wie "Mon Day" (ergänzt aktuelles Jahr)
    const now = new Date();
    const year = now.getFullYear();
    let processedDateStr = dateStr;
    const monthDayMatch = dateStr.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i
    );
    if (monthDayMatch) {
      processedDateStr = `${dateStr}, ${year}`; // z.B. "May 8, 2025"
    }
    // Versuch 3: Deutsche Formate wie "8. Mai" (ergänzt aktuelles Jahr)
    const dayMonthMatch = dateStr.match(
      /^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/i
    );
    if (dayMonthMatch) {
      // Konvertiere deutschen Monat zu englischem Äquivalent für Date()
      const monthMap: { [key: string]: string } = {
        januar: 'Jan',
        februar: 'Feb',
        märz: 'Mar',
        april: 'Apr',
        mai: 'May',
        juni: 'Jun',
        juli: 'Jul',
        august: 'Aug',
        september: 'Sep',
        oktober: 'Oct',
        november: 'Nov',
        dezember: 'Dec',
      };
      const monthName = dayMonthMatch[2].toLowerCase();
      if (monthMap[monthName]) {
        processedDateStr = `${monthMap[monthName]} ${dayMonthMatch[1]}, ${year}`; // z.B. "May 8, 2025"
      }
    }

    // Letzter Versuch mit dem potenziell modifizierten String
    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /* Ignorieren */
    }

    // Fallback
    console.warn(
      `[parseDate] Konnte Datum nicht zuverlässig parsen: "${dateStr}". Gebe Epoch zurück.`
    );
    return new Date(0); // Epoch als Fallback
  }, []);

  // --- Memoized Values ---

  // Kombiniert und sortiert externe Events für die Anzeige
  const retrievedCombinedEvents: MixedEvent[] = useMemo(() => {
    const ufcMapped = ufcEvents.map((e, i) => {
      const parsedDate = parseDate(e.dtstart);
      return {
        id: e.uid || `${e.summary?.replace(/\s+/g, '-')}-${e.dtstart || i}`, // Stabile ID generieren
        title: e.summary || 'Unbekanntes UFC Event',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
        sport: 'ufc' as const,
        date: parsedDate,
        original: e,
      };
    });
    const boxingMapped = boxingEvents.map((e, i) => {
      const parsedDate = parseDate(e.date);
      // Generiere eine stabilere ID aus den Details, falls vorhanden
      const stableId =
        e.details
          ?.substring(0, 50)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase() || `boxing-${i}`;
      return {
        id: stableId,
        title: e.details || 'Unbekannter Boxkampf',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleDateString('de-DE', { dateStyle: 'medium' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
        sport: 'boxing' as const,
        date: parsedDate,
        original: e,
      };
    });
    // Filtere Events mit ungültigem Datum (Epoch) heraus und sortiere nach Datum
    const validEvents = [...ufcMapped, ...boxingMapped].filter(
      (event) => event.date.getFullYear() > 1970 // Prüft, ob Datum gültig ist (nicht Epoch 1970)
    );
    return validEvents.sort((a, b) => a.date.getTime() - b.date.getTime()); // Sortiere nach Datum aufsteigend
  }, [ufcEvents, boxingEvents, parseDate]); // Abhängig von Rohdaten und parseDate

  // Funktion zum expliziten Neuladen der Gruppenliste (z.B. nach Gruppenlöschung)
  const refreshMyGroups = useCallback(async (): Promise<Group[]> => {
    console.log('[useDashboardData] refreshMyGroups called explicitly.'); // DEBUG
    if (!token || !user) {
      console.warn(
        '[useDashboardData] refreshMyGroups called without token/user.'
      );
      return [];
    }
    return await fetchMyGroups(); // Ruft die zentrale fetch-Funktion auf
  }, [fetchMyGroups, token, user]);

  // --- Rückgabewert des Hooks ---
  // console.log("[useDashboardData] Rendering hook, returning state."); // DEBUG
  useEffect(() => {
    console.log('[DEBUG useDashboardData] Re-render Watcher:', {
      selectedGroupId,
      selectedGroupDetails,
      selectedGroupEventsCount: selectedGroupEvents.length,
      userSubmittedTipsKeys: Object.keys(userSubmittedTips),
      isGroupDataLoading,
    });
  }, [
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    userSubmittedTips,
    isGroupDataLoading,
  ]);
  return {
    myGroups,
    retrievedCombinedEvents,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    selectedGroupHighscore,
    selectedGroupMembers,
    userSubmittedTips,
    loadingInitial,
    isGroupDataLoading,
    isLoadingCombinedEvents,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData: loadSelectedGroupData, // Exportiere loadSelectedGroupData als refreshSelectedGroupData
    updateUserTipState,
    loadCombinedEvents,
    refreshMyGroups,
  };
}
