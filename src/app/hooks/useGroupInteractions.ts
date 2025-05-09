// src/app/hooks/useGroupInteractions.ts
'use client';

import { useState, useCallback, useEffect } from 'react'; // useEffect hinzugefügt
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
  // isDeleteEventDialogOpen: boolean; // Wird durch eventToDelete gesteuert
  isDeletingSpecificEvent: boolean;
  handleInitiateDeleteEvent: (event: GroupEvent) => void;
  handleConfirmDeleteEvent: (eventId: number) => Promise<void>;
  resetDeleteEventDialog: () => void;
  // setIsDeleteEventDialogOpen: (open: boolean) => void; // Wird durch eventToDelete gesteuert
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

  // --- States ---
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
  // const [isDeleteEventDialogOpen, setIsDeleteEventDialogOpen] = useState(false); // Nicht mehr benötigt, wenn eventToDelete steuert
  const [isDeletingSpecificEvent, setIsDeletingSpecificEvent] = useState(false);

  // --- Forms ---
  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
    },
  });

  // DEBUGGING: Effekt, um Änderungen an eventToDelete zu loggen
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

  // --- Tipp Handling ---
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
        handleClearSelectedTip(eventId); // Hier wird bereits geloggt
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

  // --- Admin: Ergebnis setzen ---
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

  // --- Event anlegen ---
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
      };
      try {
        console.log(
          `${LOG_PREFIX} handleAddEventSubmit - Rufe API createEvent auf...`
        );
        await createEvent(token, eventData);
        toast.success('Event erfolgreich erstellt!');
        addEventForm.reset();
        setIsAddEventDialogOpen(false); // Stellt sicher, dass der Dialog geschlossen wird
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

  // --- Event löschen ---
  const handleInitiateDeleteEvent = useCallback((event: GroupEvent) => {
    console.log(
      `${LOG_PREFIX} handleInitiateDeleteEvent - Event wird zum Löschen vorgemerkt:`,
      event
    );
    setEventToDelete(event); // Wieder ohne Timeout
  }, []); // Abhängigkeiten prüfen, setEventToDelete ist stabil von useState

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

      const currentEventToDelete = eventToDelete; // Kopie für den Fall, dass sich der State ändert
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
        resetDeleteEventDialog(); // Ruft die Funktion auf, die eventToDelete auf null setzt
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
      eventToDelete, // Wichtig, um den Titel korrekt zu loggen und weil es Teil des Zustands ist
      refreshGroupData,
      resetDeleteEventDialog, // Da es ein useCallback ist
    ]
  );

  // --- Return ---
  // Die Return-Struktur sollte die oben definierte UseGroupInteractionsReturn-Schnittstelle erfüllen.
  // 'isDeleteEventDialogOpen' und 'setIsDeleteEventDialogOpen' sind nicht mehr nötig, wenn 'eventToDelete' den Dialog steuert.
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
