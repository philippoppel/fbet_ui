'use client';

import { useState, useCallback, useEffect } from 'react'; // KORREKTUR: useEffect importieren
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  submitTip,
  setEventResult,
  createEvent,
  deleteEvent as apiDeleteEvent,
  ApiError,
} from '@/app/lib/api';
import type { EventCreate, Event as GroupEvent } from '@/app/lib/types';
import { LoadGroupDataOptions } from '@/app/hooks/useDashboardData';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const defaultDeadlineString = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

/* -------------------------------------------------------------------------- */
/* Form-Schema                                                                */
/* -------------------------------------------------------------------------- */

const addEventFormSchema = z.object({
  title: z.string().min(5, 'Mind. 5 Zeichen'),
  description: z.string().optional(),
  question: z.string().min(5, 'Mind. 5 Zeichen'),
  options: z.string().refine(
    (v) =>
      v
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean).length >= 2,
    'Mind. 2 Optionen (eine pro Zeile)'
  ),
  tippingDeadline: z
    .string()
    .refine(
      (v) => new Date(v) > new Date(),
      'Deadline muss in der Zukunft liegen'
    ),
  has_wildcard: z.boolean(),
  wildcard_type: z.string().optional(),
  wildcard_prompt: z.string().optional(),
});

export type AddEventFormData = z.infer<typeof addEventFormSchema>;

/* -------------------------------------------------------------------------- */
/* Interfaces                                                                 */
/* -------------------------------------------------------------------------- */

interface UseGroupInteractionsProps {
  token: string | null;
  selectedGroupId: number | null;
  selectedGroupEvents: GroupEvent[];
  setEvents: React.Dispatch<React.SetStateAction<GroupEvent[]>>;
  refreshGroupDataAction: (
    groupId: number,
    opts?: LoadGroupDataOptions
  ) => Promise<void>;
  updateUserTipStateAction: (eventId: number, option: string) => void;
}

export interface UseGroupInteractionsReturn {
  selectedTips: Record<number, string>;
  wildcardInputs: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  eventToDelete: GroupEvent | null;
  isDeletingSpecificEvent: boolean;

  addEventForm: ReturnType<typeof useForm<AddEventFormData>>;

  handleOptionSelect: (eventId: number, option: string) => void;
  handleClearSelectedTip: (eventId: number) => void;
  handleWildcardInputChange: (eventId: number, value: string) => void;
  handleSubmitTip: (eventId: number) => Promise<void>;
  handleSetWildcardResult: (
    eventId: number,
    wildcardResult: string
  ) => Promise<void>;

  handleResultInputChange: (eventId: number, val: string) => void;
  handleSetResult: (eventId: number, winning: string) => Promise<void>;

  setIsAddEventDialogOpen: (open: boolean) => void;

  handleAddEventSubmit: (v: AddEventFormData) => Promise<void>;

  handleInitiateDeleteEvent: (e: GroupEvent) => void;
  handleConfirmDeleteEvent: (eventId: number) => Promise<void>;
  resetDeleteEventDialog: () => void;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useGroupInteractions({
  token,
  selectedGroupId,
  setEvents,
  selectedGroupEvents,
  refreshGroupDataAction,
  updateUserTipStateAction,
}: UseGroupInteractionsProps): UseGroupInteractionsReturn {
  const [selectedTips, setSelectedTips] = useState<Record<number, string>>({});
  const [wildcardInputs, setWildcardInputs] = useState<Record<number, string>>(
    {}
  );
  const [resultInputs, setResultInputs] = useState<Record<number, string>>({});
  const [isSubmittingTip, setIsSubmittingTip] = useState<
    Record<number, boolean>
  >({});
  const [isSettingResult, setIsSettingResult] = useState<
    Record<number, boolean>
  >({});
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GroupEvent | null>(null);
  const [isDeletingSpecificEvent, setIsDeletingSpecificEvent] = useState(false);

  // KORREKTUR 1: useState muss INNERHALB der Hook-Funktion aufgerufen werden.
  const [needsRefreshAfterDelete, setNeedsRefreshAfterDelete] = useState(false);

  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: defaultDeadlineString(),
    },
  });

  const handleSetWildcardResult = useCallback(
    async (eventId: number, wildcardResult: string) => {
      if (!token || !selectedGroupId) return;

      setIsSettingResult((p) => ({ ...p, [eventId]: true }));

      try {
        await setEventResult(token, {
          event_id: eventId,
          wildcard_answer: wildcardResult,
        } as any);

        toast.success('Wildcard-Ergebnis gespeichert');

        setResultInputs((p) => {
          const n = { ...p };
          delete n[eventId];
          return n;
        });

        await refreshGroupDataAction(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
          showLoadingSpinner: false,
        });
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.status}: ${e.detail}`
            : e instanceof Error
              ? e.message
              : '';
        toast.error('Fehler beim Speichern der Wildcard', { description: msg });
      } finally {
        setIsSettingResult((p) => ({ ...p, [eventId]: false }));
      }
    },
    [token, selectedGroupId, refreshGroupDataAction]
  );

  // KORREKTUR 2: useEffect muss INNERHALB der Hook-Funktion aufgerufen werden.
  useEffect(() => {
    if (!eventToDelete && needsRefreshAfterDelete) {
      if (selectedGroupId) {
        console.log('Dialog geschlossen, starte Daten-Refresh...');
        // KORREKTUR 3: Den korrekten Funktionsnamen aus den Props verwenden.
        refreshGroupDataAction(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: false,
          showLoadingSpinner: true,
        });
      }
      setNeedsRefreshAfterDelete(false);
    }
  }, [
    eventToDelete,
    needsRefreshAfterDelete,
    refreshGroupDataAction, // KORREKTUR 3: Korrekten Namen in der Dependency-Liste
    selectedGroupId,
  ]);

  const handleOptionSelect = (eventId: number, option: string) =>
    setSelectedTips((p) => ({ ...p, [eventId]: option }));

  const handleClearSelectedTip = (eventId: number) =>
    setSelectedTips((p) => {
      const n = { ...p };
      delete n[eventId];
      return n;
    });

  const handleWildcardInputChange = (eventId: number, value: string) =>
    setWildcardInputs((p) => ({ ...p, [eventId]: value }));

  const handleSubmitTip = useCallback(
    async (eventId: number) => {
      const option = selectedTips[eventId];
      if (!option || !token || !selectedGroupId) return;

      const wildcardGuess = wildcardInputs[eventId] || '';

      setIsSubmittingTip((p) => ({ ...p, [eventId]: true }));
      try {
        const saved = await submitTip(token, {
          event_id: eventId,
          selected_option: option,
          wildcard_guess: wildcardGuess,
        });
        updateUserTipStateAction(saved.eventId, saved.selectedOption);
        toast.success('Tipp gespeichert');
        handleClearSelectedTip(eventId);
        setWildcardInputs((p) => {
          const n = { ...p };
          delete n[eventId];
          return n;
        });
        await refreshGroupDataAction(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
          showLoadingSpinner: false,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.status}: ${e.detail}`
            : e instanceof Error
              ? e.message
              : '';
        toast.error('Tipp fehlgeschlagen', { description: msg });
      } finally {
        setIsSubmittingTip((p) => ({ ...p, [eventId]: false }));
      }
    },
    [
      selectedTips,
      wildcardInputs,
      token,
      selectedGroupId,
      refreshGroupDataAction,
      updateUserTipStateAction,
    ]
  );

  const handleResultInputChange = (id: number, val: string) =>
    setResultInputs((p) => ({ ...p, [id]: val }));

  const handleSetResult = useCallback(
    async (eventId: number, winning: string) => {
      if (!winning || !token || !selectedGroupId) return;

      setIsSettingResult((p) => ({ ...p, [eventId]: true }));
      try {
        await setEventResult(token, {
          event_id: eventId,
          winning_option: winning,
        });
        toast.success('Ergebnis gespeichert');
        setResultInputs((p) => {
          const n = { ...p };
          delete n[eventId];
          return n;
        });
        await refreshGroupDataAction(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
          showLoadingSpinner: false,
        });
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.status}: ${e.detail}`
            : e instanceof Error
              ? e.message
              : '';
        toast.error('Fehler beim Speichern', { description: msg });
      } finally {
        setIsSettingResult((p) => ({ ...p, [eventId]: false }));
      }
    },
    [token, selectedGroupId, refreshGroupDataAction]
  );

  const handleAddEventSubmit = useCallback(
    async (v: AddEventFormData) => {
      if (!token || !selectedGroupId) return;

      const options = v.options
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      if (options.length < 2) {
        addEventForm.setError('options', {
          type: 'manual',
          message: 'Mind. 2 Optionen',
        });
        return;
      }

      const eventData: EventCreate = {
        title: v.title,
        description: v.description || null,
        group_id: selectedGroupId,
        question: v.question,
        options,
        tippingDeadline: v.tippingDeadline,
        has_wildcard: v.has_wildcard,
        wildcard_prompt: v.wildcard_prompt,
        wildcard_type: v.wildcard_type as any,
      };

      try {
        await createEvent(token, eventData);
        toast.success('Event erstellt');
        addEventForm.reset();
        setIsAddEventDialogOpen(false);
        await refreshGroupDataAction(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: false,
          showLoadingSpinner: true,
        });
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.status}: ${e.detail}`
            : e instanceof Error
              ? e.message
              : '';
        toast.error('Event konnte nicht erstellt werden', { description: msg });
      }
    },
    [token, selectedGroupId, addEventForm, refreshGroupDataAction]
  );

  const handleInitiateDeleteEvent = (e: GroupEvent) => setEventToDelete(e);

  const resetDeleteEventDialog = () => setEventToDelete(null);

  const handleConfirmDeleteEvent = useCallback(
    async (eventId: number) => {
      if (!token || !selectedGroupId) return;

      setIsDeletingSpecificEvent(true);
      try {
        await apiDeleteEvent(token, eventId);
        toast.success('Event gelöscht');
        setNeedsRefreshAfterDelete(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Löschen', { description: msg });
      } finally {
        setIsDeletingSpecificEvent(false);
        resetDeleteEventDialog();
      }
    },
    [token, selectedGroupId]
  );

  return {
    selectedTips,
    wildcardInputs,
    resultInputs,
    isSubmittingTip,
    isSettingResult,
    isAddEventDialogOpen,
    eventToDelete,
    isDeletingSpecificEvent,

    addEventForm,

    handleOptionSelect,
    handleClearSelectedTip,
    handleWildcardInputChange,
    handleSubmitTip,

    handleResultInputChange,
    handleSetResult,

    setIsAddEventDialogOpen,

    handleAddEventSubmit,

    handleInitiateDeleteEvent,
    handleConfirmDeleteEvent,
    resetDeleteEventDialog,
    handleSetWildcardResult,
  };
}
