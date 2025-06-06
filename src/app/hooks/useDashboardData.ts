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
} from '@/app/lib/api'; // Annahme: getUfcSchedule und getBoxingSchedule kommen von hier
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
  FootballEvent,
} from '@/app/lib/types';
// Die direkten Imports für football_schedule Services werden nicht mehr benötigt,
// da wir den API-Endpunkt nutzen.

// Hilfsfunktion (falls noch woanders im Hook gebraucht, sonst kann sie hier weg,
// wenn addDays nur im Backend relevant war)
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export interface UseDashboardDataReturn {
  myGroups: Group[];
  retrievedCombinedEvents: MixedEvent[];
  selectedGroupId: number | null;
  selectedGroupDetails: Group | null;
  selectedGroupEvents: GroupEvent[];
  selectedGroupHighscore: HighscoreEntry[];
  selectedGroupMembers: UserOut[];
  setSelectedGroupEvents: React.Dispatch<React.SetStateAction<GroupEvent[]>>;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
  loadingInitial: boolean;
  isGroupDataLoading: boolean;
  isLoadingCombinedEvents: boolean;
  errors: {
    ufc?: string;
    boxing?: string;
    football?: string;
    groups?: string;
    groupData?: string;
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
  loadCombinedEvents: () => Promise<void>;
  refreshMyGroups: () => Promise<Group[]>;
}

export interface LoadGroupDataOptions {
  showLoadingSpinner?: boolean;
  keepExistingDetailsWhileRefreshingSubData?: boolean;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<UseDashboardDataReturn['errors']>({});

  const initialSelectedGroupId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('selectedGroupId');
      return storedId ? parseInt(storedId, 10) : null;
    }
    return null;
  }, []);

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

  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [footballEventsData, setFootballEventsData] = useState<FootballEvent[]>(
    []
  );
  const [isLoadingCombinedEvents, setIsLoadingCombinedEvents] = useState(false);

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

  const fetchMyGroups = useCallback(async (): Promise<Group[]> => {
    if (!token || !user) {
      setMyGroups([]);
      return [];
    }
    setErrors((prev) => ({ ...prev, groups: undefined }));
    try {
      const fetchedGroups = await apiGetMyGroups(token);
      const uniqueGroups = Array.from(
        new Map(fetchedGroups.map((g) => [g.id, g])).values()
      );
      setMyGroups(uniqueGroups);
      return uniqueGroups;
    } catch (groupError: any) {
      setErrors((p) => ({
        ...p,
        groups: groupError.message || 'Fehler beim Laden der Gruppen.',
      }));
      setMyGroups([]);
      return [];
    }
  }, [token, user]);

  const loadSelectedGroupData = useCallback(
    async (groupId: number, options?: LoadGroupDataOptions): Promise<void> => {
      const {
        showLoadingSpinner = true,
        keepExistingDetailsWhileRefreshingSubData = false,
      } = options || {};
      if (!token) {
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        setIsGroupDataLoading(false);
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        return;
      }

      if (!keepExistingDetailsWhileRefreshingSubData && showLoadingSpinner)
        setIsGroupDataLoading(true);
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
        allGroupTips: undefined,
      }));

      const currentGroupDetails = groupDetailsRef.current;
      const shouldFetchDetails = !(
        keepExistingDetailsWhileRefreshingSubData &&
        currentGroupDetails?.id === groupId
      );
      if (shouldFetchDetails) setSelectedGroupDetails(null);
      if (!keepExistingDetailsWhileRefreshingSubData) {
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
      }

      try {
        const [
          detailsRes,
          eventsRes,
          highscoreRes,
          membersRes,
          myTipsRes,
          allGroupTipsRes,
        ] = await Promise.allSettled([
          shouldFetchDetails
            ? getGroupDetails(token, groupId)
            : Promise.resolve(currentGroupDetails),
          getGroupEvents(token, groupId),
          getGroupHighscore(token, groupId),
          getGroupMembers(token, groupId),
          getMyTipsForGroup(token, groupId),
          getAllTipsForOpenGroupEvents(token, groupId),
        ]);

        if (detailsRes.status === 'fulfilled')
          setSelectedGroupDetails(detailsRes.value as Group | null);
        else if (shouldFetchDetails)
          console.error(
            `[useDashboardData] Group details load failed:`,
            detailsRes.reason
          );

        if (eventsRes.status === 'fulfilled')
          setSelectedGroupEvents(eventsRes.value as GroupEvent[]);
        else
          console.error(
            `[useDashboardData] Group events load failed:`,
            eventsRes.reason
          );

        if (highscoreRes.status === 'fulfilled')
          setSelectedGroupHighscore(highscoreRes.value as HighscoreEntry[]);
        else
          console.error(
            `[useDashboardData] Group highscore load failed:`,
            highscoreRes.reason
          );

        if (membersRes.status === 'fulfilled')
          setSelectedGroupMembers(membersRes.value as UserOut[]);
        else
          console.error(
            `[useDashboardData] Group members load failed:`,
            membersRes.reason
          );

        if (myTipsRes.status === 'fulfilled') {
          const tipsArray = myTipsRes.value as UserTipSelection[] | null;
          const tipsRecord =
            tipsArray?.reduce(
              (acc, tip) => {
                if (
                  tip &&
                  typeof tip.eventId === 'number' &&
                  typeof tip.selectedOption === 'string'
                )
                  acc[tip.eventId] = tip.selectedOption;
                return acc;
              },
              {} as Record<number, string>
            ) || {};
          setUserSubmittedTips(tipsRecord);
        } else {
          setErrors((prev) => ({
            ...prev,
            userTips:
              (myTipsRes.reason as Error)?.message ||
              'Eigene Tipps konnten nicht geladen werden.',
          }));
          setUserSubmittedTips({});
        }

        if (allGroupTipsRes.status === 'fulfilled') {
          const rawAllTipsPerEvent = allGroupTipsRes.value as Record<
            string,
            any[]
          >;

          const mappedAllTipsPerEvent: AllTipsPerEvent = {};
          console.log('[DEBUG allGroupTipsRes.value]', allGroupTipsRes.value);

          for (const [eventIdStr, tipsArray] of Object.entries(
            rawAllTipsPerEvent
          )) {
            const eventId = parseInt(eventIdStr, 10);

            mappedAllTipsPerEvent[eventId] = tipsArray.map((tip) => ({
              userId: tip.userId,
              userName: tip.userName,
              selectedOption: tip.selectedOption,
              wildcardGuess: tip.wildcardGuess,
            }));
          }

          setAllTipsPerEvent(mappedAllTipsPerEvent);
        } else {
          setErrors((prev) => ({
            ...prev,
            allGroupTips:
              (allGroupTipsRes.reason as Error)?.message ||
              'Tipps anderer konnten nicht geladen werden.',
          }));
          setAllTipsPerEvent({});
        }

        if (
          (shouldFetchDetails && detailsRes.status === 'rejected') ||
          eventsRes.status === 'rejected'
        ) {
          const coreError = (
            shouldFetchDetails && detailsRes.status === 'rejected'
              ? detailsRes
              : eventsRes
          ) as PromiseRejectedResult;
          setErrors((prev) => ({
            ...prev,
            groupData:
              (coreError.reason as Error)?.message ||
              'Kerndaten der Gruppe konnten nicht geladen werden.',
          }));
        }
      } catch (err: any) {
        setErrors((prev) => ({
          ...prev,
          groupData: 'Unerwarteter Systemfehler beim Laden der Gruppendaten.',
        }));
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
      } finally {
        if (!keepExistingDetailsWhileRefreshingSubData && showLoadingSpinner)
          setIsGroupDataLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;
    const loadInitialData = async () => {
      setLoadingInitial(true);
      if (token && user) {
        const groups = await fetchMyGroups();
        if (isMounted && groups.length > 0 && selectedGroupId === null) {
          const storedId = localStorage.getItem('selectedGroupId');
          const favoriteId = localStorage.getItem('favoriteGroupId');
          let idToSelect = groups[0].id; // Default to first group
          if (storedId && groups.some((g) => g.id === parseInt(storedId)))
            idToSelect = parseInt(storedId);
          else if (
            favoriteId &&
            groups.some((g) => g.id === parseInt(favoriteId))
          )
            idToSelect = parseInt(favoriteId);

          setSelectedGroupId(idToSelect);
          if (
            localStorage.getItem('selectedGroupId') !== idToSelect.toString()
          ) {
            localStorage.setItem('selectedGroupId', idToSelect.toString());
          }
        }
      } else {
        setMyGroups([]);
        setSelectedGroupId(null);
      }
      if (isMounted) setLoadingInitial(false);
    };
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [token, user, isAuthLoading, fetchMyGroups]);

  useEffect(() => {
    if (selectedGroupId !== null && token) {
      loadSelectedGroupData(selectedGroupId);
    } else if (selectedGroupId === null) {
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setUserSubmittedTips({});
      setAllTipsPerEvent({});
      setIsGroupDataLoading(false);
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
        setSelectedGroupId(groupId);
        if (groupId !== null)
          localStorage.setItem('selectedGroupId', groupId.toString());
        else localStorage.removeItem('selectedGroupId');
      }
    },
    [selectedGroupId]
  );

  const loadCombinedEvents = useCallback(async (): Promise<void> => {
    if (isLoadingCombinedEvents) return;
    // Optional: Intelligenteres Caching hier, falls nicht jedes Mal geladen werden soll,
    // wenn eine der Datenkategorien leer ist.
    // if (ufcEvents.length && boxingEvents.length && footballEventsData.length) return;

    setIsLoadingCombinedEvents(true);
    setErrors((prev) => ({
      ...prev,
      ufc: undefined,
      boxing: undefined,
      football: undefined,
      combinedEvents: undefined,
    }));
    let currentErrors: UseDashboardDataReturn['errors'] = {};

    const fetchFootballFromApi = async (): Promise<FootballEvent[]> => {
      try {
        const response = await fetch('/api/events/external/football-schedule'); // Default: 30 Tage
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              `API Fehler (${response.status}) für Fußball-Events`
          );
        }
        const data: FootballEvent[] = await response.json();
        console.log(
          '[useDashboardData] Fußball-Events von API geladen:',
          data.length
        );
        return data;
      } catch (e: any) {
        console.error(
          '[useDashboardData] Fehler beim Abrufen des Fußball-Spielplans von API:',
          e
        );
        currentErrors.football =
          e.message || 'Fehler beim Laden des Fußball-Spielplans.';
        return []; // Leeres Array im Fehlerfall, damit Promise.allSettled nicht komplett fehlschlägt
      }
    };

    try {
      const results = await Promise.allSettled([
        getUfcSchedule().catch((e) => {
          currentErrors.ufc = (e as Error)?.message || 'UFC Ladefehler';
          throw e;
        }),
        getBoxingSchedule().catch((e) => {
          currentErrors.boxing = (e as Error)?.message || 'Box Ladefehler';
          throw e;
        }),
        fetchFootballFromApi(), // Keine separate .catch Kette hier, da die Funktion selbst Fehler behandelt
      ]);

      const [ufcResult, boxingResult, footballResult] = results;

      if (ufcResult.status === 'fulfilled')
        setUfcEvents(ufcResult.value as UfcEventItem[]);
      else setUfcEvents([]); // Fehler wurde in currentErrors.ufc gesetzt

      if (boxingResult.status === 'fulfilled')
        setBoxingEvents(boxingResult.value as BoxingScheduleItem[]);
      else setBoxingEvents([]); // Fehler wurde in currentErrors.boxing gesetzt

      if (footballResult.status === 'fulfilled')
        setFootballEventsData(footballResult.value as FootballEvent[]);
      else {
        setFootballEventsData([]); // Fehler wurde in currentErrors.football innerhalb von fetchFootballFromApi gesetzt
        // Falls footballResult ein rejected Promise ist (was durch throw e in fetchFootballFromApi passieren könnte), hier zusätzlich behandeln:
        if (footballResult.status === 'rejected' && !currentErrors.football) {
          currentErrors.football =
            (footballResult.reason as Error)?.message ||
            'Unbekannter Fußball-Ladefehler.';
        }
      }

      setErrors((prev) => ({ ...prev, ...currentErrors }));

      // Kombinierte Fehlermeldung
      const failedSources = Object.entries(currentErrors)
        .filter(
          ([key, value]) => value && ['ufc', 'boxing', 'football'].includes(key)
        )
        .map(([key]) => key.toUpperCase());

      if (failedSources.length === 3) {
        setErrors((prev) => ({
          ...prev,
          combinedEvents:
            'Alle externen Event-Quellen konnten nicht geladen werden.',
        }));
      } else if (failedSources.length > 0) {
        setErrors((prev) => ({
          ...prev,
          combinedEvents: `Teile der externen Events (${failedSources.join(', ')}) konnten nicht geladen werden.`,
        }));
      }
    } catch (eventError: any) {
      // Sollte selten auftreten, da Fehler meist in den Promises gefangen werden
      console.error(
        '[useDashboardData] Kritischer Fehler in loadCombinedEvents:',
        eventError
      );
      setErrors((prev) => ({
        ...prev,
        ...currentErrors,
        combinedEvents: 'Unerwarteter Fehler beim Laden externer Events.',
      }));
    } finally {
      setIsLoadingCombinedEvents(false);
    }
  }, [
    isLoadingCombinedEvents /* Abhängigkeiten wie getUfcSchedule sind meist statisch */,
  ]);

  const parseDate = useCallback((dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date(0);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(dateStr)) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    let processedDateStr = dateStr;
    const monthDayMatch = dateStr.match(
      /^(Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)\w*\s+(\d{1,2})$/i
    );
    if (monthDayMatch) processedDateStr = `${dateStr}, ${currentYear}`;
    else {
      const dayMonthMatch = dateStr.match(
        /^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/i
      );
      if (dayMonthMatch) {
        const monthMap: Record<string, string> = {
          januar: 'January',
          februar: 'February',
          märz: 'March',
          april: 'April',
          mai: 'May',
          juni: 'June',
          juli: 'July',
          august: 'August',
          september: 'September',
          oktober: 'October',
          november: 'November',
          dezember: 'December',
        };
        const monthName = dayMonthMatch[2].toLowerCase();
        if (monthMap[monthName])
          processedDateStr = `${monthMap[monthName]} ${dayMonthMatch[1]}, ${currentYear}`;
      }
    }
    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /*ignore*/
    }
    try {
      const genericParsed = Date.parse(dateStr);
      if (!isNaN(genericParsed)) return new Date(genericParsed);
    } catch (e) {
      /*ignore*/
    }
    console.warn(
      `[useDashboardData] parseDate konnte Datum nicht zuverlässig parsen: "${dateStr}". Fallback auf Epoch.`
    );
    return new Date(0);
  }, []);

  const retrievedCombinedEvents: MixedEvent[] = useMemo(() => {
    const ufcMapped: MixedEvent[] = ufcEvents.map((e, i) => {
      const parsedUfcDate = parseDate(e.dtstart);
      return {
        id:
          e.uid ||
          `ufc-${e.summary?.replace(/\s+/g, '-') || 'event'}-${e.dtstart || i}`,
        title: e.summary || 'Unbekanntes UFC Event',
        subtitle: `${parsedUfcDate.getFullYear() > 1970 ? parsedUfcDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
        sport: 'ufc',
        date: parsedUfcDate,
        original: e,
      };
    });
    const boxingMapped: MixedEvent[] = boxingEvents.map((e, i) => {
      const parsedDate = e.parsedDate
        ? new Date(e.parsedDate)
        : parseDate(e.date);
      const baseId =
        e.details
          ?.substring(0, 50)
          .replace(/[^a-z0-9_.\-]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase() || `event-${i}`;
      return {
        id: `boxing-${baseId || `unknown-${i}`}`,
        title: e.details || 'Unbekannter Boxkampf',
        subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleDateString('de-DE', { dateStyle: 'medium' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
        sport: 'boxing',
        date: parsedDate,
        original: e,
      };
    });
    const footballMapped: MixedEvent[] = footballEventsData.map((fe) => {
      const eventDate = new Date(fe.matchDate); // Sollte valider ISO String sein
      return {
        id: `football-${fe.matchID}`,
        title: `${fe.homeTeam} vs ${fe.awayTeam}`,
        subtitle: `${fe.competition} - ${eventDate.getFullYear() > 1970 ? eventDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Datum unbekannt'}`,
        sport: 'football',
        date: eventDate,
        original: fe,
      };
    });

    const combined = [...ufcMapped, ...boxingMapped, ...footballMapped];
    const validEvents = combined.filter(
      (event) => event.date.getFullYear() > 1970
    );
    return validEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents, footballEventsData, parseDate]);

  const refreshMyGroups = useCallback(async (): Promise<Group[]> => {
    if (!token || !user) return [];
    return fetchMyGroups();
  }, [fetchMyGroups, token, user]);

  return {
    myGroups,
    retrievedCombinedEvents,
    selectedGroupId,
    selectedGroupDetails,
    selectedGroupEvents,
    setSelectedGroupEvents,
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
