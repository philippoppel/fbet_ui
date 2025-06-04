// src/app/hooks/useGroupInteractions.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
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
import type { TipOut, EventCreate, Event as GroupEvent } from '@/app/lib/types';
import { LoadGroupDataOptions } from '@/app/hooks/useDashboardData';

const LOG_PREFIX = '[useGroupInteractions]';

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Gibt das Datum "heute + 1 Monat" als String im Format YYYY-MM-DDTHH:MM zurück,
 * passend für den value eines <input type="datetime-local">.
 */
const getDefaultDeadlineString = (): string => {
  const dateInOneMonth = new Date();
  dateInOneMonth.setMonth(dateInOneMonth.getMonth() + 1);

  // Korrektur für Zeitzone, damit die *lokale* Zeit im Input landet
  const offset = dateInOneMonth.getTimezoneOffset(); // Minuten-Unterschied zu UTC
  const localDate = new Date(dateInOneMonth.getTime() - offset * 60000); // Korrigierte Zeit

  // Formatieren als YYYY-MM-DDTHH:MM
  return localDate.toISOString().slice(0, 16);
};

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
  tippingDeadline: z
    .string()
    .min(1, 'Tipp-Deadline ist erforderlich.') // Verpflichtend (nicht leer)
    .refine(
      (val) => {
        // Prüft ob Datum in der Zukunft liegt
        try {
          // Der String aus datetime-local ("YYYY-MM-DDTHH:MM") wird als lokale Zeit geparsed
          return new Date(val) > new Date();
        } catch {
          return false; // Ungültiges Format
        }
      },
      { message: 'Die Deadline muss in der Zukunft liegen.' }
    ),
});

// Der Typ wird automatisch aktualisiert, da er von addEventFormSchema abgeleitet wird
export type AddEventFormData = z.infer<typeof addEventFormSchema>;

/* -------------------------------------------------------------------------- */
/* Hook – Input / API                                                         */
/* -------------------------------------------------------------------------- */

interface UseGroupInteractionsProps {
  token: string | null;
  selectedGroupId: number | null;
  selectedGroupEvents: GroupEvent[];
  refreshGroupData: (
    groupId: number,
    options?: LoadGroupDataOptions
  ) => Promise<void>;
  updateUserTipState: (eventId: number, selectedOption: string) => void;
}

/* -------------------------------------------------------------------------- */
/* Hook Return                                                                */
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
  eventToDelete: GroupEvent | null;
  isDeletingSpecificEvent: boolean;
  handleInitiateDeleteEvent: (event: GroupEvent) => void;
  handleConfirmDeleteEvent: (eventId: number) => Promise<void>;
  resetDeleteEventDialog: () => void;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useGroupInteractions({
  token,
  selectedGroupId,
  selectedGroupEvents,
  refreshGroupData,
  updateUserTipState,
}: UseGroupInteractionsProps): UseGroupInteractionsReturn {
  console.log(
    `${LOG_PREFIX} Hook initialisiert/neu gerendert. SelectedGroupId:`,
    selectedGroupId
  );

  const [selectedTips, setSelectedTips] = useState<Record<number, string>>({});
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

  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
    },
  });

  useEffect(() => {
    console.log(
      `${LOG_PREFIX} useEffect[eventToDelete] - Wert geändert:`,
      eventToDelete
    );
    if (eventToDelete) {
      console.log(
        `${LOG_PREFIX} DeleteEventDialog sollte jetzt GEÖFFNET sein für Event:`,
        eventToDelete
      );
    } else {
      console.log(
        `${LOG_PREFIX} DeleteEventDialog sollte jetzt GESCHLOSSEN sein.`
      );
    }
  }, [eventToDelete]);

  const handleOptionSelect = (eventId: number, option: string) => {
    console.log(
      `${LOG_PREFIX} handleOptionSelect - Event ID: ${eventId}, Option: "${option}"`
    );
    setSelectedTips((p) => ({ ...p, [eventId]: option }));
  };

  const handleClearSelectedTip = (eventId: number) => {
    console.log(`${LOG_PREFIX} handleClearSelectedTip - Event ID: ${eventId}`);
    setSelectedTips((p) => {
      const n = { ...p };
      delete n[eventId];
      return n;
    });
  };

  const handleSubmitTip = useCallback(
    async (eventId: number) => {
      const selectedOption = selectedTips[eventId];
      console.log(
        `${LOG_PREFIX} handleSubmitTip - Event ID: ${eventId}, Option: "${selectedOption}"`
      );
      if (!selectedOption || !token || !selectedGroupId) {
        console.warn(
          `${LOG_PREFIX} handleSubmitTip - Abbruch: Fehlende Daten. Option: ${!!selectedOption}, Token: ${!!token}, GroupID: ${!!selectedGroupId}`
        );
        return;
      }
      setIsSubmittingTip((p) => ({ ...p, [eventId]: true }));
      try {
        console.log(
          `${LOG_PREFIX} handleSubmitTip - Rufe API submitTip auf...`
        );
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
        console.log(
          `${LOG_PREFIX} handleSubmitTip - Rufe refreshGroupData auf...`
        );
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
          showLoadingSpinner: false,
        });
        console.log(
          `${LOG_PREFIX} handleSubmitTip - refreshGroupData erfolgreich.`
        );
      } catch (err) {
        let msg = 'Dein Tipp konnte nicht gespeichert werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        console.error(`${LOG_PREFIX} handleSubmitTip - Fehler:`, err);
        toast.error('Fehler beim Tippen', { description: msg });
      } finally {
        setIsSubmittingTip((p) => ({ ...p, [eventId]: false }));
        console.log(
          `${LOG_PREFIX} handleSubmitTip - Finally Block, Event ID: ${eventId}.`
        );
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

  const handleResultInputChange = (eventId: number, value: string) => {
    console.log(
      `${LOG_PREFIX} handleResultInputChange - Event ID: ${eventId}, Wert: "${value}"`
    );
    setResultInputs((p) => ({ ...p, [eventId]: value }));
  };

  const handleSetResult = useCallback(
    async (eventId: number, winningOption: string) => {
      console.log(
        `${LOG_PREFIX} handleSetResult - Event ID: ${eventId}, Option: "${winningOption}"`
      );
      if (!winningOption || !token || !selectedGroupId) {
        console.warn(
          `${LOG_PREFIX} handleSetResult - Abbruch: Fehlende Daten. Option: ${!!winningOption}, Token: ${!!token}, GroupID: ${!!selectedGroupId}`
        );
        return;
      }
      setIsSettingResult((p) => ({ ...p, [eventId]: true }));
      try {
        console.log(
          `${LOG_PREFIX} handleSetResult - Rufe API setEventResult auf...`
        );
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
        console.log(
          `${LOG_PREFIX} handleSetResult - Rufe refreshGroupData auf...`
        );
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: true,
          showLoadingSpinner: false,
        });
        console.log(
          `${LOG_PREFIX} handleSetResult - refreshGroupData erfolgreich.`
        );
      } catch (err) {
        let msg = 'Das Ergebnis konnte nicht gespeichert werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        console.error(`${LOG_PREFIX} handleSetResult - Fehler:`, err);
        toast.error('Fehler Ergebnis', { description: msg });
      } finally {
        setIsSettingResult((p) => ({ ...p, [eventId]: false }));
        console.log(
          `${LOG_PREFIX} handleSetResult - Finally Block, Event ID: ${eventId}.`
        );
      }
    },
    [token, selectedGroupId, refreshGroupData]
  );

  const handleAddEventSubmit = useCallback(
    async (values: AddEventFormData) => {
      console.log(`${LOG_PREFIX} handleAddEventSubmit - Werte:`, values);
      if (!token || !selectedGroupId) {
        console.warn(
          `${LOG_PREFIX} handleAddEventSubmit - Abbruch: Fehlender Token oder GroupID. Token: ${!!token}, GroupID: ${!!selectedGroupId}`
        );
        return;
      }
      const optionsArray = values.options
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      if (optionsArray.length < 2) {
        addEventForm.setError('options', {
          type: 'manual',
          message: 'Min. 2 gültige Optionen.',
        });
        console.warn(
          `${LOG_PREFIX} handleAddEventSubmit - Abbruch: Nicht genug Optionen.`
        );
        return;
      }
      const eventData: EventCreate = {
        title: values.title,
        description: values.description || null,
        group_id: selectedGroupId,
        question: values.question,
        options: optionsArray,
        tippingDeadline: values.tippingDeadline,
      };
      try {
        console.log(
          `${LOG_PREFIX} handleAddEventSubmit - Rufe API createEvent auf...`
        );
        await createEvent(token, eventData);
        toast.success('Event erfolgreich erstellt!');
        addEventForm.reset();
        setIsAddEventDialogOpen(false);
        console.log(
          `${LOG_PREFIX} handleAddEventSubmit - Rufe refreshGroupData auf...`
        );
        await refreshGroupData(selectedGroupId, {
          keepExistingDetailsWhileRefreshingSubData: false,
          showLoadingSpinner: true,
        });
        console.log(
          `${LOG_PREFIX} handleAddEventSubmit - refreshGroupData erfolgreich.`
        );
      } catch (err) {
        let msg = 'Event konnte nicht erstellt werden.';
        if (err instanceof ApiError)
          msg = `${err.status}: ${err.detail || err.message}`;
        else if (err instanceof Error) msg = err.message;
        console.error(`${LOG_PREFIX} handleAddEventSubmit - Fehler:`, err);
        toast.error('Fehler Erstellen', { description: msg });
      } finally {
        console.log(`${LOG_PREFIX} handleAddEventSubmit - Finally Block.`);
      }
    },
    [token, selectedGroupId, addEventForm, refreshGroupData]
  );

  const handleInitiateDeleteEvent = useCallback((event: GroupEvent) => {
    console.log(
      `${LOG_PREFIX} handleInitiateDeleteEvent - Event wird zum Löschen vorgemerkt:`,
      event
    );
    setEventToDelete(event);
  }, []);

  const resetDeleteEventDialog = useCallback(() => {
    console.log(
      `${LOG_PREFIX} resetDeleteEventDialog - eventToDelete wird auf null gesetzt.`
    );
    setEventToDelete(null);
  }, []);

  const handleConfirmDeleteEvent = useCallback(
    async (eventId: number) => {
      if (!token || !selectedGroupId) {
        console.error(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Abbruch: Fehlender Token oder GroupID. Token: ${!!token}, GroupID: ${!!selectedGroupId}`
        );
        return;
      }

      const currentEventToDelete = eventToDelete;
      const title = currentEventToDelete?.title ?? `Event ID ${eventId}`;
      console.log(
        `${LOG_PREFIX} handleConfirmDeleteEvent - Gestartet für Event ID: ${eventId}, Titel: "${title}"`
      );

      setIsDeletingSpecificEvent(true);

      try {
        console.log(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Rufe API apiDeleteEvent auf für Event ID: ${eventId}...`
        );
        await apiDeleteEvent(token, eventId);
        toast.success(`„${title}“ wurde gelöscht.`);
        console.log(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Event "${title}" (ID: ${eventId}) erfolgreich via API gelöscht.`
        );
      } catch (err) {
        let errorMsg = 'Unbekannter Fehler beim Löschen';
        if (err instanceof Error) {
          errorMsg = err.message;
        } else if (typeof err === 'string') {
          errorMsg = err;
        }
        toast.error(`Fehler beim Löschen von „${title}“`, {
          description: errorMsg,
        });
        console.error(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Fehler beim API-Call für Event ID ${eventId}:`,
          err
        );
      } finally {
        console.log(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Finally Block gestartet für Event ID: ${eventId}.`
        );
        setIsDeletingSpecificEvent(false);
        resetDeleteEventDialog();
        console.log(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Rufe refreshGroupData auf nach dem Löschen von Event ID: ${eventId}.`
        );
        try {
          await refreshGroupData(selectedGroupId, {
            keepExistingDetailsWhileRefreshingSubData: false,
            showLoadingSpinner: true,
          });
          console.log(
            `${LOG_PREFIX} handleConfirmDeleteEvent - refreshGroupData erfolgreich abgeschlossen nach Löschen von Event ID: ${eventId}.`
          );
        } catch (refreshError) {
          console.error(
            `${LOG_PREFIX} handleConfirmDeleteEvent - Fehler während refreshGroupData nach Löschen von Event ID ${eventId}:`,
            refreshError
          );
          toast.error(
            'Fehler beim Neuladen der Gruppendaten nach dem Löschen.'
          );
        }
        console.log(
          `${LOG_PREFIX} handleConfirmDeleteEvent - Finally Block beendet für Event ID: ${eventId}.`
        );
      }
    },
    [
      token,
      selectedGroupId,
      eventToDelete,
      refreshGroupData,
      resetDeleteEventDialog,
    ]
  );

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
    eventToDelete,
    isDeletingSpecificEvent,
    handleInitiateDeleteEvent,
    handleConfirmDeleteEvent,
    resetDeleteEventDialog,
  };
}
