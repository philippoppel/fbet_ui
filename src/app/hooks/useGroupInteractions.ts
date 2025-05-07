// src/hooks/useGroupInteractions.ts
// Refresht nach *jedem* erfolgreichen Vorgang automatisch die Gruppendaten
// (soft refresh = Lists & Details bleiben sichtbar ▸ entspannteres UI).

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  submitTip,
  setEventResult,
  createEvent,
  ApiError,
} from '@/app/lib/api';
import type { TipOut, EventCreate, Event as GroupEvent } from '@/app/lib/types';
import { LoadGroupDataOptions } from '@/app/hooks/useDashboardData';

/* -------------------------------------------------------------------------- */
/*                                  Schemas                                   */
/* -------------------------------------------------------------------------- */

const addEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Titel min. 5 Zeichen.' }),
  description: z.string().optional(),
  question: z.string().min(5, { message: 'Frage min. 5 Zeichen.' }),
  options: z
    .string()
    .min(1, { message: 'Min. 2 Optionen (1 pro Zeile).' })
    .refine((v) => v.split('\n').filter((o) => o.trim()).length >= 2, {
      message: 'Min. 2 gültige Optionen.',
    }),
});
export type AddEventFormData = z.infer<typeof addEventFormSchema>;

/* -------------------------------------------------------------------------- */
/*                             Hook – Input / API                             */
/* -------------------------------------------------------------------------- */

interface UseGroupInteractionsProps {
  token: string | null;
  selectedGroupId: number | null;
  selectedGroupEvents: GroupEvent[];
  /**
   * Lädt die Gruppendaten neu. Übergib LoadGroupDataOptions für „soft“-Refresh.
   */
  refreshGroupData: (
    groupId: number,
    options?: LoadGroupDataOptions
  ) => Promise<void>;
  /** Optimistisches Updaten von userSubmittedTips in useDashboardData */
  updateUserTipState: (eventId: number, selectedOption: string) => void;
}

/* -------------------------------------------------------------------------- */
/*                                Hook Return                                 */
/* -------------------------------------------------------------------------- */

export interface UseGroupInteractionsReturn {
  selectedTips: Record<number, string>;
  resultInputs: Record<number, string>;
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  addEventForm: ReturnType<typeof useForm<AddEventFormData>>;
  handleOptionSelect: (eventId: number, option: string) => void;
  handleSubmitTip: (eventId: number) => Promise<void>;
  handleResultInputChange: (eventId: number, value: string) => void;
  handleSetResult: (eventId: number, winningOption: string) => Promise<void>;
  setIsAddEventDialogOpen: (open: boolean) => void;
  handleAddEventSubmit: (values: AddEventFormData) => Promise<void>;
  handleClearSelectedTip: (eventId: number) => void;
}

/* -------------------------------------------------------------------------- */
/*                                   Hook                                     */
/* -------------------------------------------------------------------------- */

export function useGroupInteractions({
  token,
  selectedGroupId,
  selectedGroupEvents,
  refreshGroupData,
  updateUserTipState,
}: UseGroupInteractionsProps): UseGroupInteractionsReturn {
  /* ----------------------------- Local States ----------------------------- */
  const [selectedTips, setSelectedTips] = useState<Record<number, string>>({});
  const [resultInputs, setResultInputs] = useState<Record<number, string>>({});
  const [isSubmittingTip, setIsSubmittingTip] = useState<
    Record<number, boolean>
  >({});
  const [isSettingResult, setIsSettingResult] = useState<
    Record<number, boolean>
  >({});
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);

  /* ----------------------- React-Hook-Form für neues Event ----------------------- */
  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
    },
  });

  /* -------------------------------------------------------------------------- */
  /*                               Tipp-Handling                                */
  /* -------------------------------------------------------------------------- */

  const handleOptionSelect = (eventId: number, option: string) => {
    setSelectedTips((p) => ({ ...p, [eventId]: option }));
  };

  const handleClearSelectedTip = (eventId: number) => {
    setSelectedTips((p) => {
      const n = { ...p };
      delete n[eventId];
      return n;
    });
  };

  const handleSubmitTip = useCallback(
    async (eventId: number) => {
      const selectedOption = selectedTips[eventId];
      if (!selectedOption || !token || !selectedGroupId) return;

      setIsSubmittingTip((p) => ({ ...p, [eventId]: true }));
      try {
        const savedTip = await submitTip(token, {
          event_id: eventId,
          selected_option: selectedOption,
        });

        const eventTitle =
          selectedGroupEvents.find((e) => e.id === eventId)?.title ??
          'dieses Event';

        toast.success('Tipp gespeichert!', {
          description: `Dein Tipp „${savedTip.selectedOption}“ für „${eventTitle}“ wurde gespeichert.`,
        });

        handleClearSelectedTip(eventId);
        updateUserTipState(savedTip.eventId, savedTip.selectedOption);

        // ► Soft refresh: Listen bleiben sichtbar, Daten aber aktuell
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
        });
      } catch (err) {
        let msg = 'Dein Tipp konnte nicht gespeichert werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        toast.error('Fehler beim Tippen', { description: msg });
      } finally {
        setIsSubmittingTip((p) => ({ ...p, [eventId]: false }));
      }
    },
    [
      token,
      selectedGroupId,
      selectedTips,
      selectedGroupEvents,
      refreshGroupData,
      updateUserTipState,
    ]
  );

  /* -------------------------------------------------------------------------- */
  /*                          Admin – Ergebnis setzen                           */
  /* -------------------------------------------------------------------------- */

  const handleResultInputChange = (eventId: number, value: string) => {
    setResultInputs((p) => ({ ...p, [eventId]: value }));
  };

  const handleSetResult = useCallback(
    async (eventId: number, winningOption: string) => {
      if (!winningOption || !token || !selectedGroupId) return;

      setIsSettingResult((p) => ({ ...p, [eventId]: true }));
      try {
        await setEventResult(token, {
          event_id: eventId,
          winning_option: winningOption,
        });
        toast.success('Ergebnis erfolgreich gespeichert!');

        setResultInputs((p) => {
          const n = { ...p };
          delete n[eventId];
          return n;
        });

        // ► Soft refresh nach Ergebnis
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
        });
      } catch (err) {
        let msg = 'Das Ergebnis konnte nicht gespeichert werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        toast.error('Fehler Ergebnis', { description: msg });
      } finally {
        setIsSettingResult((p) => ({ ...p, [eventId]: false }));
      }
    },
    [token, selectedGroupId, refreshGroupData]
  );

  /* -------------------------------------------------------------------------- */
  /*                               Event anlegen                               */
  /* -------------------------------------------------------------------------- */

  const handleAddEventSubmit = useCallback(
    async (values: AddEventFormData) => {
      if (!token || !selectedGroupId) return;

      const optionsArray = values.options
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      if (optionsArray.length < 2) {
        addEventForm.setError('options', {
          type: 'manual',
          message: 'Min. 2 gültige Optionen.',
        });
        return;
      }

      const eventData: EventCreate = {
        title: values.title,
        description: values.description || null,
        group_id: selectedGroupId,
        question: values.question,
        options: optionsArray,
      };

      try {
        await createEvent(token, eventData);
        toast.success('Event erfolgreich erstellt!');
        addEventForm.reset();
        setIsAddEventDialogOpen(false);

        // ► Soft refresh nach Neuerstellung
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
        });
      } catch (err) {
        let msg = 'Event konnte nicht erstellt werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        toast.error('Fehler Erstellen', { description: msg });
      }
    },
    [token, selectedGroupId, addEventForm, refreshGroupData]
  );

  /* -------------------------------------------------------------------------- */
  /*                                  Return                                   */
  /* -------------------------------------------------------------------------- */

  return {
    selectedTips,
    resultInputs,
    isSubmittingTip,
    isSettingResult,
    isAddEventDialogOpen,
    addEventForm,
    handleOptionSelect,
    handleSubmitTip,
    handleResultInputChange,
    handleSetResult,
    setIsAddEventDialogOpen,
    handleAddEventSubmit,
    handleClearSelectedTip,
  };
}
