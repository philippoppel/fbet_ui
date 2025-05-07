// src/hooks/useGroupInteractions.ts
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  submitTip, // API-Funktion gibt TipOut zurück
  setEventResult,
  createEvent,
  ApiError,
} from '@/app/lib/api';
import type {
  TipCreate,
  TipOut, // Typ für die Antwort von submitTip
  EventCreate,
  Event as GroupEvent,
} from '@/app/lib/types';

// Zod Schema für das Hinzufügen von Events (unverändert)
const addEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Titel min. 5 Zeichen.' }),
  description: z.string().optional(), // Optional im Schema
  question: z.string().min(5, { message: 'Frage min. 5 Zeichen.' }),
  options: z
    .string()
    .min(1, { message: 'Min. 2 Optionen (1 pro Zeile).' })
    .refine(
      (value) =>
        value.split('\n').filter((opt) => opt.trim() !== '').length >= 2,
      { message: 'Min. 2 gültige Optionen.' }
    ),
});
export type AddEventFormData = z.infer<typeof addEventFormSchema>;

// Input Props für den Hook (angepasst)
interface UseGroupInteractionsProps {
  token: string | null;
  selectedGroupId: number | null;
  selectedGroupEvents: GroupEvent[]; // Zur Anzeige von Event-Infos in Toasts
  refreshGroupData: (
    // Wird für Event-Erstellung/Ergebnis gebraucht
    groupId: number,
    showLoadingSpinner?: boolean
  ) => Promise<void>;
  updateUserTipState: (eventId: number, selectedOption: string) => void; // <<--- NEUE PROP für Tipp-Update
}

// Rückgabetyp des Hooks (angepasst)
export interface UseGroupInteractionsReturn {
  selectedTips: Record<number, string>; // Lokale UI-Auswahl
  resultInputs: Record<number, string>; // Für Admin-Ergebnis-Dialog
  isSubmittingTip: Record<number, boolean>;
  isSettingResult: Record<number, boolean>;
  isAddEventDialogOpen: boolean;
  addEventForm: ReturnType<typeof useForm<AddEventFormData>>;
  handleOptionSelect: (eventId: number, option: string) => void;
  handleSubmitTip: (eventId: number) => Promise<void>; // Logik geändert
  handleResultInputChange: (eventId: number, value: string) => void;
  handleSetResult: (eventId: number, winningOption: string) => Promise<void>; // winningOption ist string
  setIsAddEventDialogOpen: (isOpen: boolean) => void;
  handleAddEventSubmit: (values: AddEventFormData) => Promise<void>;
  handleClearSelectedTip: (eventId: number) => void; // Handler zum Verwerfen der UI-Auswahl
}

export function useGroupInteractions({
  token,
  selectedGroupId,
  selectedGroupEvents,
  refreshGroupData, // Wird noch für andere Aktionen benötigt
  updateUserTipState, // <<--- NEUE PROP wird verwendet
}: UseGroupInteractionsProps): UseGroupInteractionsReturn {
  // States für UI-Interaktionen
  const [selectedTips, setSelectedTips] = useState<Record<number, string>>({}); // Aktuelle Auswahl im UI
  const [resultInputs, setResultInputs] = useState<Record<number, string>>({}); // Für Admin-Dialog
  const [isSubmittingTip, setIsSubmittingTip] = useState<
    Record<number, boolean>
  >({});
  const [isSettingResult, setIsSettingResult] = useState<
    Record<number, boolean>
  >({});
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);

  // Formular für das Hinzufügen von Events
  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
    },
  });

  // Handler: Wenn eine Tipp-Option im UI ausgewählt wird
  const handleOptionSelect = (eventId: number, option: string) => {
    setSelectedTips((prev) => ({ ...prev, [eventId]: option }));
  };

  // Handler: Verwirft die aktuelle UI-Auswahl für ein Event
  const handleClearSelectedTip = (eventId: number) => {
    setSelectedTips((prev) => {
      const newState = { ...prev };
      delete newState[eventId];
      return newState;
    });
  };

  // Handler: Sendet den Tipp an das Backend (oder aktualisiert ihn)
  const handleSubmitTip = async (eventId: number) => {
    const selectedOption = selectedTips[eventId]; // Holt die aktuelle UI-Auswahl
    if (!selectedOption || !token || !selectedGroupId) {
      console.warn('handleSubmitTip: Fehlende Daten', {
        selectedOption,
        token,
        selectedGroupId,
      });
      return; // Frühzeitiger Abbruch, wenn keine Auswahl oder kein Token/Gruppe
    }

    setIsSubmittingTip((prev) => ({ ...prev, [eventId]: true })); // Ladezustand für Button aktivieren

    try {
      // API-Aufruf an POST /api/tips (mit Upsert-Logik im Backend)
      const savedTip: TipOut = await submitTip(token, {
        event_id: eventId,
        selected_option: selectedOption,
      });

      // Erfolg-Toast anzeigen
      const eventTitle =
        selectedGroupEvents.find((e) => e.id === eventId)?.title ||
        'dieses Event';
      toast.success('Tipp gespeichert!', {
        description: `Dein Tipp "${savedTip.selected_option}" für "${eventTitle}" wurde gespeichert.`,
      });

      // --- OPTIMIERUNG: Direkte State-Updates statt Full Refresh ---
      // 1. Lokale UI-Auswahl zurücksetzen (da der Tipp jetzt gespeichert ist)
      handleClearSelectedTip(eventId);
      // 2. Den globalen State der gespeicherten Tipps im useDashboardData Hook aktualisieren
      updateUserTipState(savedTip.event_id, savedTip.selected_option);
      // 3. KEIN refreshGroupData mehr hier!
      // await refreshGroupData(selectedGroupId, false); // <-- ENTFERNT
    } catch (err) {
      console.error('Fehler beim Tipp abgeben:', err);
      let msg = 'Dein Tipp konnte nicht gespeichert werden.';
      if (err instanceof ApiError)
        msg = `${err.status}: ${err.detail || err.message}`;
      else if (err instanceof Error) msg = err.message;
      toast.error('Fehler beim Tippen', { description: msg });
      // Hinweis: Die lokale UI-Auswahl (selectedTips) bleibt bei einem Fehler bestehen,
      // damit der Benutzer es erneut versuchen kann, ohne neu klicken zu müssen.
    } finally {
      setIsSubmittingTip((prev) => ({ ...prev, [eventId]: false })); // Ladezustand beenden
    }
  };

  // Handler: Aktualisiert den Input-State für den Admin-Ergebnis-Dialog
  const handleResultInputChange = (eventId: number, value: string) => {
    setResultInputs((prev) => ({ ...prev, [eventId]: value }));
  };

  // Handler: Sendet das Event-Ergebnis an das Backend
  const handleSetResult = async (eventId: number, winningOption: string) => {
    if (!winningOption || !token || !selectedGroupId) {
      toast.error('Ungültige Eingabe für Ergebnis.');
      return;
    }
    setIsSettingResult((prev) => ({ ...prev, [eventId]: true }));
    try {
      // API-Aufruf an POST /api/events/result
      await setEventResult(token, {
        event_id: eventId,
        winning_option: winningOption,
      });
      toast.success('Ergebnis erfolgreich gespeichert!');
      setResultInputs((prev) => {
        // Admin-UI-State zurücksetzen
        const n = { ...prev };
        delete n[eventId];
        return n;
      });
      // Hier ist ein Refresh sinnvoll, da sich Punkte und Event-Status ändern
      await refreshGroupData(selectedGroupId, false);
    } catch (err) {
      console.error('Fehler beim Ergebnis speichern:', err);
      let msg = 'Das Ergebnis konnte nicht gespeichert werden.';
      if (err instanceof ApiError)
        msg = `${err.status}: ${err.detail || err.message}`;
      else if (err instanceof Error) msg = err.message;
      toast.error('Fehler Ergebnis', { description: msg });
    } finally {
      setIsSettingResult((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  // Handler: Sendet die Daten für ein neues Event an das Backend
  const handleAddEventSubmit = async (values: AddEventFormData) => {
    if (!token || !selectedGroupId) return;
    const optionsArray = values.options
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o);
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
      // API-Aufruf an POST /api/events
      await createEvent(token, eventData);
      toast.success('Event erfolgreich erstellt!');
      addEventForm.reset(); // Formular zurücksetzen
      setIsAddEventDialogOpen(false); // Dialog schließen
      // Hier ist ein Refresh sinnvoll, um das neue Event in der Liste anzuzeigen
      await refreshGroupData(selectedGroupId, false);
    } catch (err) {
      console.error('Fehler Event erstellen:', err);
      let msg = 'Event konnte nicht erstellt werden.';
      if (err instanceof ApiError)
        msg = `${err.status}: ${err.detail || err.message}`;
      else if (err instanceof Error) msg = err.message;
      toast.error('Fehler Erstellen', { description: msg });
    }
    // Ladezustand für das Erstellen wird über form.formState.isSubmitting gehandhabt
  };

  // Rückgabewert des Hooks
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
    handleClearSelectedTip, // Wichtig für OpenEventsCard
  };
}
