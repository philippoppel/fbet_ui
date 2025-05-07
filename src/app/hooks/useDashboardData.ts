// src/app/hooks/useDashboardData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getUfcSchedule,
  getBoxingSchedule,
  getMyGroups,
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
  MixedEvent,
  Event as GroupEvent,
  HighscoreEntry,
  UserOut,
  UserTipSelection,
} from '@/app/lib/types';

interface LoadGroupDataOptions {
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
    combinedEvents?: string;
  };
  handleSelectGroup: (groupId: number) => void;
  refreshSelectedGroupData: (
    groupId: number,
    options?: LoadGroupDataOptions
  ) => Promise<void>;
  updateUserTipState: (eventId: number, selectedOption: string) => void;
  loadCombinedEvents: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const [ufcEvents, setUfcEvents] = useState<UfcEventItem[]>([]);
  const [boxingEvents, setBoxingEvents] = useState<BoxingScheduleItem[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errors, setErrors] = useState<UseDashboardDataReturn['errors']>({});
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] =
    useState<Group | null>(null); // Dieser State wird gelesen, ist aber keine direkte dep von loadSelectedGroupData useCallback mehr
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

  const updateUserTipState = useCallback(
    (eventId: number, selectedOption: string) => {
      setUserSubmittedTips((prevTips) => ({
        ...prevTips,
        [eventId]: selectedOption,
      }));
    },
    []
  );

  const loadSelectedGroupData = useCallback(
    async (groupId: number, options?: LoadGroupDataOptions) => {
      const {
        showLoadingSpinner = true,
        keepExistingDetailsWhileRefreshingSubData = false,
      } = options || {};

      if (!token) {
        setErrors((prev) => ({ ...prev, groupData: 'Nicht eingeloggt.' }));
        if (showLoadingSpinner) setIsGroupDataLoading(false);
        setSelectedGroupDetails(null);
        setSelectedGroupEvents([]);
        setSelectedGroupHighscore([]);
        setSelectedGroupMembers([]);
        setUserSubmittedTips({});
        return;
      }

      if (showLoadingSpinner) setIsGroupDataLoading(true);
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
      }));

      // Wichtig: Lesen des aktuellen selectedGroupDetails States hier, nicht über useCallback Dependency
      const currentGroupDetailsState = selectedGroupDetails;
      let shouldFetchDetails = true;

      if (
        keepExistingDetailsWhileRefreshingSubData &&
        currentGroupDetailsState &&
        currentGroupDetailsState.id === groupId
      ) {
        shouldFetchDetails = false;
      } else {
        setSelectedGroupDetails(null); // Details zurücksetzen, wenn sie neu geladen werden oder Gruppe wechselt
      }

      setSelectedGroupEvents([]);
      setSelectedGroupHighscore([]);
      setSelectedGroupMembers([]);
      setUserSubmittedTips({});

      const promisesToFetch = [];
      if (shouldFetchDetails) {
        promisesToFetch.push(getGroupDetails(token, groupId));
      } else {
        promisesToFetch.push(Promise.resolve(currentGroupDetailsState)); // Bereits vorhandene Details verwenden
      }
      promisesToFetch.push(getGroupEvents(token, groupId));
      promisesToFetch.push(getGroupHighscore(token, groupId));
      promisesToFetch.push(getGroupMembers(token, groupId));
      promisesToFetch.push(getMyTipsForGroup(token, groupId));

      let fetchErrorOccurredForCoreData = false;

      try {
        const results = await Promise.allSettled(promisesToFetch);

        const groupDetailsResult = results[0];
        if (groupDetailsResult.status === 'fulfilled') {
          setSelectedGroupDetails(groupDetailsResult.value as Group | null);
        } else if (shouldFetchDetails) {
          console.error('Failed Detail Load:', groupDetailsResult.reason);
          fetchErrorOccurredForCoreData = true;
        }

        const groupEventsResult = results[1];
        if (groupEventsResult.status === 'fulfilled') {
          setSelectedGroupEvents(groupEventsResult.value as GroupEvent[]);
        } else {
          console.error('Failed Event Load:', groupEventsResult.reason);
          fetchErrorOccurredForCoreData = true;
        }

        const groupHighscoreResult = results[2];
        if (groupHighscoreResult.status === 'fulfilled') {
          setSelectedGroupHighscore(
            groupHighscoreResult.value as HighscoreEntry[]
          );
        } else {
          console.error('Failed Highscore Load:', groupHighscoreResult.reason);
          fetchErrorOccurredForCoreData = true;
        }

        const groupMembersResult = results[3];
        if (groupMembersResult.status === 'fulfilled') {
          setSelectedGroupMembers(groupMembersResult.value as UserOut[]);
        } else {
          console.error('Failed Members Load:', groupMembersResult.reason);
          fetchErrorOccurredForCoreData = true;
        }

        const userTipsResult = results[4];
        if (userTipsResult.status === 'fulfilled') {
          const tipsArray = (userTipsResult.value as UserTipSelection[]) ?? [];
          const tipsRecord: Record<number, string> = {};
          tipsArray.forEach((tip) => {
            if (
              tip &&
              typeof tip.eventId === 'number' &&
              typeof tip.selectedOption === 'string'
            ) {
              tipsRecord[tip.eventId] = tip.selectedOption;
            }
          });
          setUserSubmittedTips(tipsRecord);
        } else {
          // status === 'rejected'
          console.error('Failed User Tips Load:', userTipsResult.reason);
          setErrors((prev) => ({
            ...prev,
            userTips:
              (userTipsResult.reason as Error)?.message ||
              'Gespeicherte Tipps konnten nicht geladen werden.',
          }));
        }

        if (fetchErrorOccurredForCoreData) {
          const firstCoreRejected = (shouldFetchDetails ? [results[0]] : [])
            .concat([results[1], results[2], results[3]])
            .find((r) => r.status === 'rejected');

          let errorMessage =
            'Teile der Gruppendaten konnten nicht geladen werden.';
          if (firstCoreRejected && firstCoreRejected.status === 'rejected') {
            const reason = firstCoreRejected.reason;
            if (reason instanceof ApiError) {
              errorMessage = `${reason.status}: ${reason.detail || reason.message || 'API Fehler'}`;
            } else if (reason instanceof Error) {
              errorMessage = reason.message;
            } else {
              errorMessage = 'Unbekannter Fehler beim Laden der Kerndaten.';
            }
          }
          setErrors((prev) => ({ ...prev, groupData: errorMessage }));
        }
      } catch (err: any) {
        console.error(
          'Unexpected error in loadSelectedGroupData wrapper:',
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
      } finally {
        if (showLoadingSpinner) setIsGroupDataLoading(false);
      }
    },
    [token] // WICHTIG: `selectedGroupDetails` wurde aus den Abhängigkeiten entfernt!
    // Die Funktion greift über `currentGroupDetailsState` auf den jeweils aktuellen Wert zu.
    // Dadurch ändert sich die Referenz von `loadSelectedGroupData` nur noch, wenn sich `token` ändert.
  );

  useEffect(() => {
    if (isAuthLoading) return;
    const loadInitialDashboardData = async () => {
      if (!token || !user) {
        setLoadingInitial(false);
        setMyGroups([]);
        setSelectedGroupId(null);
        setSelectedGroupDetails(null);
        return;
      }
      setLoadingInitial(true);
      setErrors((prev) => ({ ...prev, groups: undefined }));
      try {
        const fetchedGroups = await getMyGroups(token);
        const uniqueGroups = Array.from(
          new Map(fetchedGroups.map((g) => [g.id, g])).values()
        );
        setMyGroups(uniqueGroups);
        if (uniqueGroups.length > 0 && selectedGroupId === null) {
          setSelectedGroupId(uniqueGroups[0].id);
        } else if (uniqueGroups.length === 0) {
          setSelectedGroupId(null);
        }
      } catch (groupError: any) {
        console.error('Groups Load Failed:', groupError);
        setErrors((p) => ({
          ...p,
          groups: groupError.message || 'Fehler beim Laden der Gruppen.',
        }));
        setSelectedGroupId(null);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadInitialDashboardData();
  }, [token, user, isAuthLoading, selectedGroupId]); // selectedGroupId hinzugefügt, falls es extern gesetzt werden könnte und eine Neuauswahl triggern soll

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
      if (isGroupDataLoading) setIsGroupDataLoading(false);
      setErrors((prev) => ({
        ...prev,
        groupData: undefined,
        userTips: undefined,
      }));
    }
  }, [selectedGroupId, token, loadSelectedGroupData]); // `loadSelectedGroupData` ist jetzt stabiler.

  const handleSelectGroup = useCallback(
    (groupId: number) => {
      if (groupId !== selectedGroupId) {
        setSelectedGroupId(groupId);
      }
    },
    [selectedGroupId]
  );

  const loadCombinedEvents = useCallback(async () => {
    if (
      (ufcEvents.length > 0 || boxingEvents.length > 0) &&
      !isLoadingCombinedEvents
    ) {
      return;
    }
    if (isLoadingCombinedEvents) return;
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
  }, [ufcEvents.length, boxingEvents.length, isLoadingCombinedEvents]);

  const parseDate = useCallback((dateStr: string | null | undefined): Date => {
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
      processedDateStr = `${dayMonthMatch[1]} ${dayMonthMatch[2]} ${year}`;
    }
    try {
      const parsed = new Date(processedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch (e) {
      /* Ignorieren */
    }
    console.warn(
      `[parseDate] Konnte Datum nicht parsen: "${dateStr}". Gebe Epoch zurück.`
    );
    return new Date(0);
  }, []);

  const retrievedCombinedEvents: MixedEvent[] = useMemo(() => {
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
        e.details?.substring(0, 50).replace(/\s+/g, '-').toLowerCase() ||
        `boxing-${i}`;
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
    refreshSelectedGroupData: loadSelectedGroupData,
    updateUserTipState,
    loadCombinedEvents,
  };
}
