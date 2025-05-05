// src/hooks/useGroupInteractions.ts
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { submitTip, setEventResult, createEvent, ApiError } from '@/lib/api';
import type {
  TipCreate,
  EventResultSet,
  EventCreate,
  Event as GroupEvent,
} from '@/lib/types';
import { router } from 'next/client';

// --- Zod Schema Definition ---
const addEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Titel min. 5 Zeichen.' }),
  description: z.string().optional(),
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
// --- Typ Exportieren ---
export type AddEventFormData = z.infer<typeof addEventFormSchema>;

// --- Input Props ---
interface UseGroupInteractionsProps {
  token: string | null;
  selectedGroupId: number | null;
  selectedGroupEvents: GroupEvent[];
  refreshGroupData: (
    groupId: number,
    showLoadingSpinner?: boolean
  ) => Promise<void>;
}

// --- Rückgabetyp ---
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
  handleSetResult: (eventId: number, options: string[]) => Promise<void>;
  setIsAddEventDialogOpen: (isOpen: boolean) => void;
  handleAddEventSubmit: (values: AddEventFormData) => Promise<void>;
}

export function useGroupInteractions({
  token,
  selectedGroupId,
  selectedGroupEvents,
  refreshGroupData,
}: UseGroupInteractionsProps): UseGroupInteractionsReturn {
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

  // --- Formular ---
  const addEventForm = useForm<AddEventFormData>({
    resolver: zodResolver(addEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
    },
  });

  // --- Handler (mit voller Fehlerbehandlung) ---
  const handleOptionSelect = (eventId: number, option: string) => {
    setSelectedTips((prev) => ({ ...prev, [eventId]: option }));
  };

  const handleSubmitTip = async (eventId: number) => {
    const selectedOption = selectedTips[eventId];
    if (!selectedOption || !token || !selectedGroupId) return;
    setIsSubmittingTip((prev) => ({ ...prev, [eventId]: true }));
    try {
      await submitTip(token, {
        event_id: eventId,
        selected_option: selectedOption,
      });
      toast.success('Tipp gespeichert!', {
        description: `Dein Tipp für "${selectedGroupEvents.find((e) => e.id === eventId)?.title || 'Event'}" war ${selectedOption}`,
      });
      setSelectedTips((prev) => {
        const n = { ...prev };
        delete n[eventId];
        return n;
      });
      await refreshGroupData(selectedGroupId, false);
    } catch (err) {
      console.error('Fehler Tipp:', err);
      let msg = 'Fehler.';
      if (err instanceof ApiError) {
        msg = `${err.status}: ${err.detail || err.message}`;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error('Fehler Tippen', { description: msg });
    } finally {
      setIsSubmittingTip((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleResultInputChange = (eventId: number, value: string) => {
    setResultInputs((prev) => ({ ...prev, [eventId]: value }));
  };

  const handleSetResult = async (eventId: number, options: string[]) => {
    const winningOption = resultInputs[eventId];
    if (
      !winningOption ||
      !token ||
      !selectedGroupId ||
      !options.includes(winningOption)
    ) {
      toast.error('Ungültige Eingabe.');
      return;
    }
    setIsSettingResult((prev) => ({ ...prev, [eventId]: true }));
    try {
      await setEventResult(token, {
        event_id: eventId,
        winning_option: winningOption,
      });
      toast.success('Ergebnis gespeichert!');
      setResultInputs((prev) => {
        const n = { ...prev };
        delete n[eventId];
        return n;
      });
      await refreshGroupData(selectedGroupId, false);
    } catch (err) {
      console.error('Fehler Ergebnis:', err);
      let msg = 'Fehler.';
      if (err instanceof ApiError) {
        msg = `${err.status}: ${err.detail || err.message}`;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error('Fehler Ergebnis', { description: msg });
    } finally {
      setIsSettingResult((prev) => ({ ...prev, [eventId]: false }));
    }
  };

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
      await createEvent(token, eventData);
      toast.success('Event erstellt!');
      addEventForm.reset();
      setIsAddEventDialogOpen(false);
      await refreshGroupData(selectedGroupId, false);
    } catch (err) {
      console.error('Fehler Event erstellen:', err);
      let msg = 'Fehler.';
      if (err instanceof ApiError) {
        msg = `${err.status}: ${err.detail || err.message}`;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error('Fehler Erstellen', { description: msg });
    }
  };

  // --- Rückgabewert ---
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
  };
}
