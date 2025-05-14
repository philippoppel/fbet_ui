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
  // ApiError, // ApiError wird im Code nicht explizit verwendet, kann ggf. entfernt werden, wenn nicht anderweitig benötigt
} from '@/app/lib/api';
import type {
  UfcEventItem,
  BoxingScheduleItem, // Stellen Sie sicher, dass diese Schnittstelle parsedDate enthält
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
  loadCombinedEvents: () => Promise<void>;
  refreshMyGroups: () => Promise<Group[]>;
}

// Der Custom Hook
export function useDashboardData(): UseDashboardDataReturn {
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<UseDashboardDataReturn['errors']>({});

  // Initial selectedGroupId from localStorage
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
  const [isLoadingCombinedEvents, setIsLoadingCombinedEvents] = useState(false);

  // State für externe Event-Daten
  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]); // Annahme: BoxingScheduleItem enthält parsedDate

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
      return Promise.resolve([]);
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
      console.error(
        '[useDashboardData] fetchMyGroups Load Failed:',
        groupError
      );
      setErrors((p) => ({
        ...p,
        groups: groupError.message || 'Fehler beim Laden der Gruppen.',
      }));
      setMyGroups([]);
      return Promise.resolve([]);
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
        setUserSubmittedTips({});
        setAllTipsPerEvent({});
        return;
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
        setSelectedGroupDetails(null); // Reset details if not keeping or different group
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

        if (detailsRes.status === 'fulfilled') {
          setSelectedGroupDetails(detailsRes.value as Group | null);
        } else if (shouldFetchDetails) {
          console.error(
            `[useDashboardData] Failed to load group details:`,
            detailsRes.reason
          );
        }

        if (eventsRes.status === 'fulfilled') {
          setSelectedGroupEvents(eventsRes.value as GroupEvent[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group events:`,
            eventsRes.reason
          );
        }

        if (highscoreRes.status === 'fulfilled') {
          setSelectedGroupHighscore(highscoreRes.value as HighscoreEntry[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group highscore:`,
            highscoreRes.reason
          );
        }

        if (membersRes.status === 'fulfilled') {
          setSelectedGroupMembers(membersRes.value as UserOut[]);
        } else {
          console.error(
            `[useDashboardData] Failed to load group members:`,
            membersRes.reason
          );
        }

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
        // Reset all group specific data on critical error
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
      }
    },
    [token]
  );

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    const loadInitialDashboardData = async () => {
      setLoadingInitial(true);
      if (token && user) {
        const groups = await fetchMyGroups();
        if (isMounted && groups.length > 0 && selectedGroupId === null) {
          let initialGroupIdToSet: number | null = null;
          const stored = localStorage.getItem('selectedGroupId');
          if (stored && groups.some((g) => g.id === parseInt(stored))) {
            initialGroupIdToSet = parseInt(stored);
          } else {
            const favorite = localStorage.getItem('favoriteGroupId');
            if (favorite && groups.some((g) => g.id === parseInt(favorite))) {
              initialGroupIdToSet = parseInt(favorite);
            } else {
              initialGroupIdToSet = groups[0].id; // Default to the first group
            }
          }
          if (initialGroupIdToSet !== null) {
            setSelectedGroupId(initialGroupIdToSet);
            // Persist this initial choice if it was derived and not directly from localStorage['selectedGroupId']
            if (
              localStorage.getItem('selectedGroupId') !==
              initialGroupIdToSet.toString()
            ) {
              localStorage.setItem(
                'selectedGroupId',
                initialGroupIdToSet.toString()
              );
            }
          }
        }
      } else {
        // No token or user
        setMyGroups([]);
        setSelectedGroupId(null);
      }
      if (isMounted) {
        setLoadingInitial(false);
      }
    };
    loadInitialDashboardData();
    return () => {
      isMounted = false;
    };
  }, [token, user, isAuthLoading, fetchMyGroups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId !== null && token) {
      loadSelectedGroupData(selectedGroupId, {
        showLoadingSpinner: true,
        keepExistingDetailsWhileRefreshingSubData: false,
      });
    } else if (selectedGroupId === null) {
      // Clear group specific data if no group is selected
      setSelectedGroupDetails(null);
      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setUserSubmittedTips({});
      setAllTipsPerEvent({});
      if (isGroupDataLoading) {
        // Stop loading indicator if it was running
        setIsGroupDataLoading(false);
      }
      // Clear related errors
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
        allGroupTips: undefined,
      }));
    }
  }, [selectedGroupId, token, loadSelectedGroupData]); // loadSelectedGroupData is a dependency

  const handleSelectGroup = useCallback(
    (groupId: number | null) => {
      if (groupId !== selectedGroupId) {
        // Only update if the ID actually changed
        setSelectedGroupId(groupId); // Update state first
        if (groupId !== null) {
          localStorage.setItem('selectedGroupId', groupId.toString());
        } else {
          localStorage.removeItem('selectedGroupId');
        }
      }
    },
    [selectedGroupId] // Dependency on selectedGroupId to correctly compare
  );

  const loadCombinedEvents = useCallback(async (): Promise<void> => {
    if (
      isLoadingCombinedEvents ||
      (ufcEvents.length > 0 && boxingEvents.length > 0)
    ) {
      return;
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
        setBoxingEvents(boxingResult.value); // boxingResult.value should be BoxingScheduleItem[] (incl. parsedDate)
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
  }, [isLoadingCombinedEvents, ufcEvents.length, boxingEvents.length]);

  // General purpose date parser, used for UFC dtstart and as fallback
  const parseDate = useCallback((dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date(0); // Return an invalid date marker (epoch)

    // Try to parse as ISO string or other directly supported formats first
    try {
      const parsedTimestamp = Date.parse(dateStr);
      if (!isNaN(parsedTimestamp)) return new Date(parsedTimestamp);
    } catch (e) {
      /* Ignore */
    }

    const now = new Date();
    // For "Month Day" formats, assume current year. This is a common convention.
    // Current date: Wednesday, May 14, 2025 at 9:16 PM CEST
    const year = now.getFullYear(); // Will be 2025
    let processedDateStr = dateStr;

    // Regex for "Mon Day" (e.g., "Aug 25", "June 8")
    const monthDayMatch = dateStr.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})$/i
    );
    if (monthDayMatch) {
      // monthDayMatch[0] is full match e.g. "June 8"
      // monthDayMatch[1] is month e.g. "Jun"
      // monthDayMatch[2] is day e.g. "8"
      // Reconstruct with full month name for better new Date() compatibility if needed, or use as is.
      // Using dateStr (which is "Month Day") and appending year is usually robust.
      processedDateStr = `${dateStr}, ${year}`;
    } else {
      // Regex for "DD. MonthName" (German, e.g., "25. August", "08. Juni")
      const dayMonthMatch = dateStr.match(
        /^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)/i
      );
      if (dayMonthMatch) {
        const monthMap: { [key: string]: string } = {
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
        if (monthMap[monthName]) {
          // Construct as "Month Day, Year" for robust parsing
          processedDateStr = `${monthMap[monthName]} ${dayMonthMatch[1]}, ${year}`;
        }
      }
    }

    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /* Ignore */
    }

    console.warn(
      `[useDashboardData - parseDate] Konnte Datum nicht zuverlässig parsen: "${dateStr}" (verarbeitet als "${processedDateStr}"). Gebe Epoch zurück.`
    );
    return new Date(0); // Fallback to epoch
  }, []);

  const retrievedCombinedEvents: MixedEvent[] = useMemo(() => {
    const ufcMapped: MixedEvent[] = ufcEvents.map((e, i) => {
      const parsedUfcDate = parseDate(e.dtstart); // Use the hook's parseDate for UFC
      return {
        id:
          e.uid ||
          `ufc-${e.summary?.replace(/\s+/g, '-') || 'event'}-${e.dtstart || i}`,
        title: e.summary || 'Unbekanntes UFC Event',
        subtitle: `${parsedUfcDate.getFullYear() > 1970 ? parsedUfcDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
        sport: 'ufc' as const,
        date: parsedUfcDate,
        original: e,
      };
    });

    const boxingMapped: MixedEvent[] = boxingEvents.map((e, i) => {
      let parsedBoxingDateObject: Date;

      if (e.parsedDate && typeof e.parsedDate === 'string') {
        // Prioritize the ISO string from scraping
        parsedBoxingDateObject = new Date(e.parsedDate);
      } else {
        parsedBoxingDateObject = parseDate(e.date); // Fallback to parsing the original date string
      }

      // Robust ID generation for boxing events
      const baseId =
        e.details
          ?.substring(0, 50)
          .replace(/[^a-z0-9_.\-]/gi, '-') // Allow alphanumeric, underscore, dot, hyphen
          .replace(/-+/g, '-') // Replace multiple hyphens with a single one
          .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
          .toLowerCase() || `event-${i}`;
      const uniqueBoxingId = `boxing-${baseId || `unknown-${i}`}`; // Ensure baseId is not empty

      return {
        id: uniqueBoxingId,
        title: e.details || 'Unbekannter Boxkampf',
        subtitle: `${parsedBoxingDateObject.getFullYear() > 1970 ? parsedBoxingDateObject.toLocaleDateString('de-DE', { dateStyle: 'medium' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
        sport: 'boxing' as const,
        date: parsedBoxingDateObject,
        original: e,
      };
    });

    const combinedEvents = [...ufcMapped, ...boxingMapped];
    const validEvents = combinedEvents.filter(
      (event) => event.date.getFullYear() > 1970 // Ensure date is valid (not epoch)
    );
    return validEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [ufcEvents, boxingEvents, parseDate]); // parseDate is a dependency

  const refreshMyGroups = useCallback(async (): Promise<Group[]> => {
    if (!token || !user) {
      return Promise.resolve([]);
    }
    // Directly call fetchMyGroups which handles state updates and errors
    return fetchMyGroups();
  }, [fetchMyGroups, token, user]);

  // Optional: useEffect for logging state changes for debugging
  // useEffect(() => {
  //   console.log('[useDashboardData] State Snapshot:', {
  //     selectedGroupId, userSubmittedTips, errors, loadingInitial, isGroupDataLoading, myGroups, retrievedCombinedEvents
  //   });
  // }, [selectedGroupId, userSubmittedTips, errors, loadingInitial, isGroupDataLoading, myGroups, retrievedCombinedEvents]);

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
