// src/app/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getUfcSchedule,
  getBoxingSchedule,
  getMyGroups as apiGetMyGroups,
  getGroupDetails,
  getGroupEvents,
  getGroupHighscore,
  getGroupMembers,
  getMyTipsForGroup,
  getAllTipsForOpenGroupEvents,
  ApiError,
} from '@/app/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem,
  Group,
  MixedEvent,
  Event as GroupEvent,
  HighscoreEntry,
  UserOut,
  UserTipSelection,
  AllTipsPerEvent,
} from '@/app/lib/types';

export interface LoadGroupDataOptions {
  showLoadingSpinner?: boolean;
  keepExistingDetailsWhileRefreshingSubData?: boolean;
}

export interface UseDashboardDataReturn {
  myGroups: Group[];
  retrievedCombinedEvents: MixedEvent[];
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: UserOut[];
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
  loadingInitial: boolean;
  isGroupDataLoading: boolean;
  isLoadingCombinedEvents: boolean;
  errors: {
    ufc?: string;
    boxing?: string;
    groups?: string;
    groupData?: string;
    general?: string;
    userTips?: string;
    allGroupTips?: string;
    combinedEvents?: string;
  };
  handleSelectGroup: (groupId: number | null) => void;
  refreshSelectedGroupData: (
    groupId: number,
    options?: LoadGroupDataOptions
  ) => Promise<void>;
  updateUserTipState: (eventId: number, selectedOption: string) => void;
  loadCombinedEvents: () => Promise<void>; // Gibt Promise<void> zurück
  refreshMyGroups: () => Promise<Group[]>; // Gibt Promise<Group[]> zurück
}

// Der Custom Hook
export function useDashboardData(): UseDashboardDataReturn {
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<UseDashboardDataReturn['errors']>({});
  const initialSelectedGroupId =
    typeof window !== 'undefined'
      ? parseInt(localStorage.getItem('selectedGroupId') || '', 10) || null
      : null;

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    initialSelectedGroupId
  );
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
  const [allTipsPerEvent, setAllTipsPerEvent] = useState<AllTipsPerEvent>({});
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);
  const [isLoadingCombinedEvents, setIsLoadingCombinedEvents] = useState(false);
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);

  const groupDetailsRef = useRef<Group | null>(null);
  useEffect(() => {
    groupDetailsRef.current = selectedGroupDetails;
  }, [selectedGroupDetails]);

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
    if (!token || !user) {
      setMyGroups([]);
      return Promise.resolve([]); // Explizit ein Promise mit leerem Array zurückgeben
    }
    setErrors((prev) => ({ ...prev, groups: undefined }));
    try {
      const fetchedGroups = await apiGetMyGroups(token);
      const uniqueGroups = Array.from(
        new Map(fetchedGroups.map((g) => [g.id, g])).values()
      );
      setMyGroups(uniqueGroups);
      return uniqueGroups; // Gibt Group[] zurück, async macht es zu Promise<Group[]>
    } catch (groupError: any) {
      console.error(
        '[useDashboardData] fetchMyGroups Load Failed:',
        groupError
      );
      setErrors((p) => ({
        ...p,
        groups: groupError.message || 'Fehler beim Laden der Gruppen.',
      }));
      setMyGroups([]);
      return Promise.resolve([]); // Im Fehlerfall explizit ein Promise mit leerem Array
    }
  }, [token, user]);

  const loadSelectedGroupData = useCallback(
    async (groupId: number, options?: LoadGroupDataOptions): Promise<void> => {
      // Expliziter Rückgabetyp Promise<void>
      const {
        showLoadingSpinner = true,
        keepExistingDetailsWhileRefreshingSubData = false,
      } = options || {};

      const loadingOperationId = Date.now();
      // console.log(`[useDashboardData] loadSelectedGroupData START - GroupID: ${groupId}`);

      if (!token) {
        // console.warn('[useDashboardData] loadSelectedGroupData: No token, aborting.');
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        setIsGroupDataLoading(false);
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
        return; // Wichtig: Funktion hier beenden
      }

      let wasLoadingSet = false;
      if (!keepExistingDetailsWhileRefreshingSubData && showLoadingSpinner) {
        setIsGroupDataLoading(true);
        wasLoadingSet = true;
      }
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
        allGroupTips: undefined,
      }));

      const currentGroupDetailsFromState = groupDetailsRef.current;
      let shouldFetchDetails = true;
      let initialDetailsForPromise: Group | null = null;

      if (
        keepExistingDetailsWhileRefreshingSubData &&
        currentGroupDetailsFromState &&
        currentGroupDetailsFromState.id === groupId
      ) {
        shouldFetchDetails = false;
        initialDetailsForPromise = currentGroupDetailsFromState;
      } else {
        setSelectedGroupDetails(null);
      }

      if (!keepExistingDetailsWhileRefreshingSubData) {
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
      }

      const promisesToFetch: Promise<any>[] = [
        shouldFetchDetails
          ? getGroupDetails(token, groupId)
          : Promise.resolve(initialDetailsForPromise),
        getGroupEvents(token, groupId),
        getGroupHighscore(token, groupId),
        getGroupMembers(token, groupId),
        getMyTipsForGroup(token, groupId),
        getAllTipsForOpenGroupEvents(token, groupId),
      ];

      try {
        const results = await Promise.allSettled(promisesToFetch);
        const [
          detailsRes,
          eventsRes,
          highscoreRes,
          membersRes,
          myTipsRes,
          allGroupTipsRes,
        ] = results;

        // Details
        if (detailsRes.status === 'fulfilled') {
          setSelectedGroupDetails(detailsRes.value as Group | null);
        } else if (shouldFetchDetails) {
          console.error(
            `[useDashboardData] Failed to load group details:`,
            detailsRes.reason
          );
        }

        // Events
        if (eventsRes.status === 'fulfilled') {
          setSelectedGroupEvents(eventsRes.value as GroupEvent[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group events:`,
            eventsRes.reason
          );
        }

        // Highscore
        if (highscoreRes.status === 'fulfilled') {
          setSelectedGroupHighscore(highscoreRes.value as HighscoreEntry[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group highscore:`,
            highscoreRes.reason
          );
        }

        // Members
        if (membersRes.status === 'fulfilled') {
          setSelectedGroupMembers(membersRes.value as UserOut[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group members:`,
            membersRes.reason
          );
        }

        // MyTips (UserSubmittedTips)
        if (myTipsRes.status === 'fulfilled') {
          const tipsArray = myTipsRes.value as UserTipSelection[] | null;
          const tipsRecord: Record<number, string> = {};
          if (Array.isArray(tipsArray)) {
            tipsArray.forEach((tip) => {
              if (
                tip &&
                typeof tip.eventId === 'number' &&
                typeof tip.selectedOption === 'string'
              ) {
                tipsRecord[tip.eventId] = tip.selectedOption;
              }
            });
          } else if (tipsArray !== null) {
            console.warn(
              '[useDashboardData] getMyTipsForGroup did not return an array or null:',
              tipsArray
            );
          }
          setUserSubmittedTips(tipsRecord);
        } else {
          console.error(
            `[useDashboardData] Failed to load user submitted tips:`,
            myTipsRes.reason
          );
          setErrors((prev) => ({
            ...prev,
            userTips:
              (myTipsRes.reason as Error)?.message ||
              'Eigene Tipps konnten nicht geladen werden.',
          }));
          setUserSubmittedTips({});
        }

        // AllGroupTips
        if (allGroupTipsRes.status === 'fulfilled') {
          setAllTipsPerEvent(allGroupTipsRes.value as AllTipsPerEvent);
        } else {
          console.error(
            `[useDashboardData] Failed to load all group tips:`,
            allGroupTipsRes.reason
          );
          setErrors((prev) => ({
            ...prev,
            allGroupTips:
              (allGroupTipsRes.reason as Error)?.message ||
              'Tipps anderer konnten nicht geladen werden.',
          }));
          setAllTipsPerEvent({});
        }
        // Fehlerbehandlung für groupData (Beispiel)
        let fetchErrorOccurredForCoreData = false;
        if (
          (shouldFetchDetails && detailsRes.status === 'rejected') ||
          eventsRes.status === 'rejected'
        ) {
          fetchErrorOccurredForCoreData = true;
        }
        if (fetchErrorOccurredForCoreData) {
          const firstCoreError = [detailsRes, eventsRes].find(
            (r) => r.status === 'rejected'
          );
          const errorMessage =
            firstCoreError && firstCoreError.status === 'rejected'
              ? (firstCoreError.reason as Error)?.message ||
                'Kerndaten konnten nicht geladen werden.'
              : 'Kerndaten konnten nicht geladen werden.';
          setErrors((prev) => ({ ...prev, groupData: errorMessage }));
        }
      } catch (err: any) {
        console.error(
          `[useDashboardData] CRITICAL error in loadSelectedGroupData:`,
          err
        );
        setErrors((prev) => ({
          ...prev,
          groupData: 'Unerwarteter Systemfehler.',
        }));
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
      } finally {
        if (wasLoadingSet) {
          setIsGroupDataLoading(false);
        }
        // console.log(`[useDashboardData] loadSelectedGroupData END - GroupID: ${groupId}`);
      }
    },
    [token] // Nur token als Abhängigkeit, da andere Werte (wie groupDetailsRef) sich nicht ändern sollten, um die Funktion neu zu definieren
  );

  useEffect(() => {
    if (isAuthLoading) return;
    const loadInitialDashboardData = async () => {
      setLoadingInitial(true);
      if (token && user) {
        const groups = await fetchMyGroups();
        if (groups.length > 0 && selectedGroupId === null) {
          let initialGroupId: number | null = null;

          const stored = localStorage.getItem('selectedGroupId');
          if (stored && groups.some((g) => g.id === parseInt(stored))) {
            initialGroupId = parseInt(stored);
          } else {
            const favorite = localStorage.getItem('favoriteGroupId');
            if (favorite && groups.some((g) => g.id === parseInt(favorite))) {
              initialGroupId = parseInt(favorite);
            } else {
              initialGroupId = groups[0].id;
            }
          }

          setSelectedGroupId(initialGroupId);
        }
      } else {
        setMyGroups([]);
        setSelectedGroupId(null);
      }
      setLoadingInitial(false);
    };
    loadInitialDashboardData();
  }, [token, user, isAuthLoading, fetchMyGroups, selectedGroupId]); // selectedGroupId hinzugefügt, um auf Änderungen zu reagieren, falls es extern gesetzt wird

  useEffect(() => {
    if (selectedGroupId !== null && token) {
      loadSelectedGroupData(selectedGroupId, {
        showLoadingSpinner: true,
        keepExistingDetailsWhileRefreshingSubData: false,
      });
    } else if (selectedGroupId === null) {
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setUserSubmittedTips({});
      setAllTipsPerEvent({});
      if (isGroupDataLoading) {
        setIsGroupDataLoading(false);
      }
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
        allGroupTips: undefined,
      }));
    }
  }, [selectedGroupId, token, loadSelectedGroupData]);

  const handleSelectGroup = useCallback(
    (groupId: number | null) => {
      if (groupId !== selectedGroupId) {
        if (groupId !== null) {
          localStorage.setItem('selectedGroupId', groupId.toString());
        } else {
          localStorage.removeItem('selectedGroupId');
        }
        setSelectedGroupId(groupId);
      }
    },
    [selectedGroupId]
  );

  // Funktion zum Laden der externen Events
  const loadCombinedEvents = useCallback(async (): Promise<void> => {
    if (
      isLoadingCombinedEvents ||
      (ufcEvents.length > 0 && boxingEvents.length > 0)
    ) {
      return; // Nicht laden, wenn schon geladen oder Ladevorgang läuft
    }
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

      if (ufcResult.status === 'fulfilled') {
        setUfcEvents(ufcResult.value);
      } else {
        console.error('UFC Load Failed:', ufcResult.reason);
        setErrors((p) => ({
          ...p,
          ufc: (ufcResult.reason as Error)?.message || 'UFC Ladefehler',
        }));
      }

      if (boxingResult.status === 'fulfilled') {
        setBoxingEvents(boxingResult.value);
      } else {
        console.error('Boxing Load Failed:', boxingResult.reason);
        setErrors((p) => ({
          ...p,
          boxing: (boxingResult.reason as Error)?.message || 'Box Ladefehler',
        }));
      }

      if (
        ufcResult.status === 'rejected' ||
        boxingResult.status === 'rejected'
      ) {
        setErrors((p) => ({
          ...p,
          combinedEvents:
            'Teile der externen Events konnten nicht geladen werden.',
        }));
      }
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
  }, [isLoadingCombinedEvents, ufcEvents.length, boxingEvents.length]); // Abhängigkeiten präzisiert

  const parseDate = useCallback((dateStr: string | null | undefined): Date => {
    // ... (Implementierung bleibt gleich)
    if (!dateStr) return new Date(0);
    try {
      const parsedTimestamp = Date.parse(dateStr);
      if (!isNaN(parsedTimestamp)) return new Date(parsedTimestamp);
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
    const dayMonthMatch = dateStr.match(
      /^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/i
    );
    if (dayMonthMatch) {
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
        processedDateStr = `${monthMap[monthName]} ${dayMonthMatch[1]}, ${year}`;
      }
    }
    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /* Ignorieren */
    }
    console.warn(
      `[parseDate] Konnte Datum nicht zuverlässig parsen: "${dateStr}". Gebe Epoch zurück.`
    );
    return new Date(0);
  }, []);

  const retrievedCombinedEvents: MixedEvent[] = useMemo(() => {
    // ... (Implementierung bleibt gleich)
    const ufcMapped = ufcEvents.map((e, i) => {
      const parsedDate = parseDate(e.dtstart);
      return {
        id: e.uid || `${e.summary?.replace(/\s+/g, '-')}-${e.dtstart || i}`,
        title: e.summary || 'Unbekanntes UFC Event',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
        sport: 'ufc' as const,
        date: parsedDate,
        original: e,
      };
    });
    const boxingMapped = boxingEvents.map((e, i) => {
      const parsedDate = parseDate(e.date);
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
    const validEvents = [...ufcMapped, ...boxingMapped].filter(
      (event) => event.date.getFullYear() > 1970
    );
    return validEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents, parseDate]);

  // Funktion zum expliziten Neuladen der Gruppenliste
  const refreshMyGroups = useCallback(async (): Promise<Group[]> => {
    if (!token || !user) {
      // console.warn('[useDashboardData] refreshMyGroups: No token or user, returning empty array.');
      return Promise.resolve([]); // Explizit ein Promise zurückgeben
    }
    try {
      // Ruft die innere fetchMyGroups auf, die bereits Promise<Group[]> zurückgibt
      return await fetchMyGroups();
    } catch (error) {
      console.error(
        '[useDashboardData] refreshMyGroups: Error calling fetchMyGroups:',
        error
      );
      return Promise.resolve([]); // Im Fehlerfall auch ein leeres Array als Promise
    }
  }, [fetchMyGroups, token, user]); // fetchMyGroups ist eine Abhängigkeit

  useEffect(() => {
    // console.log('[useDashboardData] State Snapshot:', { /* ... */ });
  }, [
    selectedGroupId,
    userSubmittedTips,
    allTipsPerEvent,
    errors.userTips,
    loadingInitial,
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
    allTipsPerEvent,
    loadingInitial,
    isGroupDataLoading,
    isLoadingCombinedEvents,
    errors,
    handleSelectGroup,
    refreshSelectedGroupData: loadSelectedGroupData,
    updateUserTipState,
    loadCombinedEvents,
    refreshMyGroups,
  };
}
