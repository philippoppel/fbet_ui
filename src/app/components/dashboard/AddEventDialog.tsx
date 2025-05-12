// src/components/dashboard/AddEventDialog.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // NEU: useEffect, useCallback
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/app/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input'; // Wird für Deadline und ggf. in EventList verwendet
import TextareaAutosize from 'react-textarea-autosize';
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles, AlertTriangle } from 'lucide-react'; // NEU: AlertTriangle
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
// Stelle sicher, dass AddEventFormData aus dem Hook tippingDeadline: string enthält
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import type {
  // NEU: Typen für Event-Vorschläge
  MixedEvent,
  UfcEventItem,
  BoxingScheduleItem,
} from '@/app/lib/types';
import { getUfcSchedule, getBoxingSchedule } from '@/app/lib/api'; // NEU: API-Funktionen importieren
import { EventList } from '@/app/components/dashboard/EventList'; // NEU: Komponente für Event-Vorschläge

// --- HILFSFUNKTIONEN ---

// (extractAIFields bleibt wie vorher)
const extractAIFields = (text: string): Partial<AddEventFormData> => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let title = '';
  let question = '';
  let description = '';
  let options: string[] = [];
  let parsingState: 'none' | 'options' | 'description' = 'none';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('titel:')) {
      title = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.includes('frage:')) {
      question = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.includes('optionen:')) {
      parsingState = 'options';
    } else if (lowerLine.includes('beschreibung:')) {
      description = line.split(':').slice(1).join(':').trim();
      parsingState = 'description';
    } else if (parsingState === 'options') {
      if (line.match(/^(\*|\-|\d+\.|[A-Z]\))\s+/)) {
        options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
      } else if (
        line.length > 0 &&
        !line.includes(':') &&
        !['titel:', 'frage:', 'beschreibung:'].some((kw) =>
          lowerLine.includes(kw)
        )
      ) {
        options.push(line.trim());
      } else {
        parsingState = 'none';
      }
    } else if (parsingState === 'description') {
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) => lowerLine.includes(kw))
      ) {
        description += '\n' + line;
      } else {
        parsingState = 'none';
      }
    }
  }
  description = description.trim();
  return {
    title: title,
    question: question || title,
    description: description,
    options: options.join('\n'),
  };
};

// (getDefaultDeadlineString bleibt wie vorher)
const getDefaultDeadlineString = (date?: Date): string => {
  const targetDate = date || new Date();
  if (!date) {
    // Nur wenn kein Datum übergeben wurde, einen Monat addieren
    targetDate.setMonth(targetDate.getMonth() + 1);
  }

  const offset = targetDate.getTimezoneOffset();
  const localDate = new Date(targetDate.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

// NEU: Hilfsfunktion zum Parsen von Daten für Event-Vorschläge
const parseDateForSuggestions = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date(0); // Ungültiges Datum, um es später leicht filtern zu können
  try {
    // Versuch, direkt als Timestamp zu parsen (z.B. ISO-String)
    const parsedTimestamp = Date.parse(dateStr);
    if (!isNaN(parsedTimestamp)) return new Date(parsedTimestamp);
  } catch (e) {
    /* Ignorieren */
  }

  // Fallback für Formate wie "Month Day" oder "Day. MonthName"
  const now = new Date();
  const year = now.getFullYear();
  let processedDateStr = dateStr;

  // "Mon Day" (z.B. "Aug 25")
  const monthDayMatch = dateStr.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i
  );
  if (monthDayMatch) {
    processedDateStr = `${dateStr}, ${year}`; // Annahme: aktuelles Jahr
  }

  // "DD. Monat" (z.B. "25. August" oder "25. Aug")
  const dayMonthMatch = dateStr.match(
    /^(\d{1,2})\.\s+(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan|Feb|Mrz|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)/i
  );
  if (dayMonthMatch) {
    processedDateStr = `${dayMonthMatch[1]} ${dayMonthMatch[2]} ${year}`; // Annahme: aktuelles Jahr
  }

  try {
    const parsed = new Date(processedDateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) {
    /* Ignorieren */
  }

  console.warn(
    `[parseDateForSuggestions] Konnte Datum nicht parsen: "${dateStr}". Setze auf ungültiges Datum.`
  );
  return new Date(0); // Gibt ein "ungültiges" Datum zurück, wenn alles fehlschlägt
};

// --- PROPS ---
type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

// --- KOMPONENTE ---
export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  // NEU: State für Event-Vorschläge
  const [internalSuggestions, setInternalSuggestions] = useState<MixedEvent[]>(
    []
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const resetFormToDefaults = useCallback(() => {
    form.reset({
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
    });
    // Trigger Autosize für Textareas und Input
    setTimeout(() => {
      document
        .querySelectorAll(
          'textarea[data-react-textarea-autosize="true"], input[type="datetime-local"]'
        )
        .forEach((el) => {
          const event = new Event('input', { bubbles: true });
          try {
            el.dispatchEvent(event);
          } catch (e) {
            console.error('Error dispatching event for autosize/reset', e);
          }
        });
    }, 0);
  }, [form]);

  // NEU: Funktion zum Laden der Event-Vorschläge
  const loadSuggestions = useCallback(async () => {
    if (internalSuggestions.length > 0 && !suggestionsError) return; // Nicht erneut laden, wenn bereits erfolgreich geladen
    if (isLoadingSuggestions) return;

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    // setInternalSuggestions([]); // Optional: Alte Vorschläge leeren

    try {
      const [ufcResult, boxingResult] = await Promise.allSettled([
        getUfcSchedule(),
        getBoxingSchedule(),
      ]);

      let ufcEventsData: UfcEventItem[] = [];
      let boxingEventsData: BoxingScheduleItem[] = [];
      let errors: string[] = [];

      if (ufcResult.status === 'fulfilled') {
        ufcEventsData = ufcResult.value;
      } else {
        console.error('Fehler beim Laden der UFC Events:', ufcResult.reason);
        errors.push('UFC Events konnten nicht geladen werden.');
      }

      if (boxingResult.status === 'fulfilled') {
        boxingEventsData = boxingResult.value;
      } else {
        console.error(
          'Fehler beim Laden der Boxing Events:',
          boxingResult.reason
        );
        errors.push('Box-Events konnten nicht geladen werden.');
      }

      if (errors.length === 2) {
        setSuggestionsError(
          'Fehler beim Laden aller externen Event-Vorschläge.'
        );
      } else if (errors.length === 1) {
        setSuggestionsError(errors[0]);
      }

      const ufcMapped: MixedEvent[] = ufcEventsData.map((e, i) => {
        const parsedDate = parseDateForSuggestions(e.dtstart);
        return {
          id:
            e.uid || `ufc-${e.summary?.replace(/\s+/g, '-')}-${e.dtstart || i}`,
          title: e.summary || 'Unbekanntes UFC Event',
          subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
          sport: 'ufc' as const,
          date: parsedDate,
          original: e,
        };
      });

      const boxingMapped: MixedEvent[] = boxingEventsData.map((e, i) => {
        const parsedDate = parseDateForSuggestions(e.date);
        const stableId =
          e.details?.substring(0, 50).replace(/\s+/g, '-').toLowerCase() ||
          `boxing-${i}`;
        return {
          id: `boxing-${stableId}`,
          title: e.details || 'Unbekannter Boxkampf',
          subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleDateString('de-DE', { dateStyle: 'medium' }) : '?'} – ${e.location || '?'} ${e.broadcaster ? `(${e.broadcaster})` : ''}`,
          sport: 'boxing' as const,
          date: parsedDate,
          original: e,
        };
      });

      const combinedEvents = [...ufcMapped, ...boxingMapped];
      const validEvents = combinedEvents.filter(
        (event) => event.date.getFullYear() > 1970
      ); // Filtere ungültige Daten
      const sortedEvents = validEvents.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      setInternalSuggestions(sortedEvents);
      if (sortedEvents.length === 0 && errors.length === 0) {
        // Keine Fehler, aber auch keine Events (z.B. leere API Antworten)
        setSuggestionsError('Keine aktuellen Event-Vorschläge gefunden.');
      }
    } catch (error) {
      console.error('Generischer Fehler beim Laden der Vorschläge:', error);
      setSuggestionsError(
        'Ein unerwarteter Fehler ist aufgetreten beim Laden der Vorschläge.'
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isLoadingSuggestions, internalSuggestions.length, suggestionsError]); // Abhängigkeiten aktualisiert

  // NEU: useEffect zum Laden der Vorschläge, wenn der Dialog geöffnet wird
  useEffect(() => {
    if (
      open &&
      (internalSuggestions.length === 0 || suggestionsError) &&
      !isLoadingSuggestions
    ) {
      loadSuggestions();
    }
  }, [
    open,
    loadSuggestions,
    internalSuggestions.length,
    suggestionsError,
    isLoadingSuggestions,
  ]);

  // Funktion generateAiSuggestion - angepasst für Deadline Reset
  const generateAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/generate-ai-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `lustige Wette für Gruppe "${groupName}"`,
        }),
      });

      if (!res.ok) {
        let errorMsg = `API-Fehler: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const suggestion = extractAIFields(data.message || '');
      if (!suggestion.title && !suggestion.question) {
        toast.error('AI konnte keine gültige Wette erzeugen.', {
          description: 'Das Format der AI-Antwort war unerwartet.',
        });
        return;
      }

      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '',
        description: suggestion.description || '',
        options: suggestion.options || '',
        tippingDeadline: getDefaultDeadlineString(), // Standard-Deadline
      });

      setTimeout(() => {
        document
          .querySelectorAll(
            'textarea[data-react-textarea-autosize="true"], input[type="datetime-local"]'
          )
          .forEach((el) => {
            const event = new Event('input', { bubbles: true });
            try {
              el.dispatchEvent(event);
            } catch (e) {
              console.error('Error dispatching event for AI autosize', e);
            }
          });
      }, 0);
      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler bei AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // NEU: Handler für Klick auf einen Event-Vorschlag
  const handleSuggestionClick = (suggestedEvent: MixedEvent) => {
    let title = suggestedEvent.title || 'Event Titel';
    let description = `Vorgeschlagenes Event: ${title}`;
    let question = 'Wer gewinnt?'; // Standardfrage
    let options = ['Team 1 gewinnt', 'Team 2 gewinnt', 'Unentschieden']; // Angepasste Optionen

    // Spezifische Anpassungen basierend auf Sportart
    if (suggestedEvent.sport === 'ufc' && suggestedEvent.original) {
      const ufcItem = suggestedEvent.original as UfcEventItem;
      // Beispiel: Kämpfer aus dem Titel extrahieren (sehr vereinfacht)
      const fighters = ufcItem.summary?.split(' vs ');
      if (fighters && fighters.length === 2) {
        options = [
          `${fighters[0].trim()} gewinnt`,
          `${fighters[1].trim()} gewinnt`,
        ];
        if (!ufcItem.summary?.toLowerCase().includes('main event')) {
          // Nur wenn nicht Main Event, Option "Unentschieden" anbieten
          options.push('Unentschieden (Draw)'); // Selten im UFC, aber möglich
        }
      }
      description = `UFC Event: ${ufcItem.summary || title}\nOrt: ${ufcItem.location || 'N/A'}`;
      question = `Wer gewinnt den Kampf: ${ufcItem.summary || title}?`;
    } else if (suggestedEvent.sport === 'boxing' && suggestedEvent.original) {
      const boxingItem = suggestedEvent.original as BoxingScheduleItem;
      const fighters = boxingItem.details?.split(' vs ');
      if (fighters && fighters.length === 2) {
        options = [
          `${fighters[0].trim()} gewinnt`,
          `${fighters[1].trim()} gewinnt`,
          'Unentschieden',
        ];
      }
      description = `Boxkampf: ${boxingItem.details || title}\nOrt: ${boxingItem.location || 'N/A'}, Übertragen von: ${boxingItem.broadcaster || 'N/A'}`;
      question = `Wer gewinnt den Boxkampf: ${boxingItem.details || title}?`;
    }

    form.reset({
      title: title.slice(0, 250),
      question: question.slice(0, 250),
      options: options.join('\n'),
      description: description.slice(0, 500),
      // Setze Deadline auf das Datum des Events, wenn vorhanden und in der Zukunft, sonst Standard
      tippingDeadline:
        suggestedEvent.date &&
        suggestedEvent.date.getTime() > new Date().getTime()
          ? getDefaultDeadlineString(suggestedEvent.date)
          : getDefaultDeadlineString(),
    });

    setTimeout(() => {
      document
        .querySelectorAll(
          'textarea[data-react-textarea-autosize="true"], input[type="datetime-local"]'
        )
        .forEach((el) => {
          const event = new Event('input', { bubbles: true });
          try {
            el.dispatchEvent(event);
          } catch (e) {
            console.error('Error dispatching event for suggestion autosize', e);
          }
        });
    }, 0);

    toast.success('Vorschlag übernommen', {
      description: `"${title}" wurde ins Formular eingetragen. Deadline: ${form.getValues('tippingDeadline').replace('T', ' ')}`,
    });
  };

  const defaultTrigger = (
    <Button size='sm' variant='ghost' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette
    </Button>
  );

  const textareaBaseClasses =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          resetFormToDefaults(); // Formular zurücksetzen beim Schließen
          // Optional: Auch Vorschläge zurücksetzen, wenn sie bei jedem Öffnen neu geladen werden sollen
          // setInternalSuggestions([]);
          // setSuggestionsError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps} variant='ghost'>
            {triggerProps.children || (
              <>
                <PlusCircle className='mr-2 h-4 w-4' /> Neues Event
              </>
            )}
          </Button>
        ) : (
          defaultTrigger
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        <DialogHeader className='flex-shrink-0'>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Manuell ausfüllen, AI-Vorschlag nutzen oder aus der Liste wählen.
            Tipp-Deadline ist erforderlich.
          </DialogDescription>
        </DialogHeader>
        {/* Scrollbarer Hauptbereich */}
        {/* WICHTIG: padding-right anpassen, wenn Scrollbar im Div ist, oder overflow-y-auto auf DialogContent setzen */}
        <div className='flex-grow overflow-y-auto px-1 pr-3'>
          {' '}
          {/* pr-3 für Scrollbar-Platz */}
          <div className='px-6 pt-2 pb-4'>
            {' '}
            {/* Innerer Container für Padding */}
            <Form {...form}>
              <form
                id='add-event-form'
                className='space-y-4'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          placeholder='Welcher Freund muss absagen beim nächsten Event?'
                          minRows={1}
                          maxRows={3}
                          className={textareaBaseClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung (Optional)</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          placeholder='Genauere Definition, Regeln etc.'
                          minRows={2}
                          maxRows={5}
                          className={textareaBaseClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='grid md:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='question'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frage</FormLabel>
                        <FormControl>
                          <TextareaAutosize
                            placeholder='Wer?'
                            minRows={1}
                            maxRows={3}
                            className={textareaBaseClasses}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='options'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Optionen</FormLabel>
                        <FormControl>
                          <TextareaAutosize
                            placeholder={'Option 1\nOption 2\n...'}
                            minRows={3}
                            maxRows={6}
                            className={`${textareaBaseClasses} whitespace-pre-wrap`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Eine Option pro Zeile (min. 2)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name='tippingDeadline'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipp-Deadline</FormLabel>
                      <FormControl>
                        <Input
                          type='datetime-local'
                          className='block w-full border-input'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Bis wann dürfen Tipps abgegeben werden?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            {/* NEU: Bereich für Event-Vorschläge */}
            <div className='mt-6 pt-6 border-t'>
              <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                <Sparkles className='w-5 h-5 text-muted-foreground' />{' '}
                {/* Anderes Icon als AI */}
                Event-Vorschläge übernehmen
              </h3>
              {isLoadingSuggestions && (
                <div className='flex items-center justify-center py-4 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' />
                  <span>Lade Vorschläge...</span>
                </div>
              )}
              {suggestionsError && !isLoadingSuggestions && (
                <div className='flex flex-col items-center justify-center py-4 text-destructive bg-destructive/10 rounded-md p-4'>
                  <AlertTriangle className='h-8 w-8 mb-2' />
                  <p className='font-medium'>
                    Fehler beim Laden der Vorschläge
                  </p>
                  <p className='text-sm text-center mb-3'>{suggestionsError}</p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={loadSuggestions} // Erneut versuchen
                    disabled={isLoadingSuggestions}
                  >
                    {isLoadingSuggestions ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : null}
                    Erneut versuchen
                  </Button>
                </div>
              )}
              {!isLoadingSuggestions &&
                !suggestionsError &&
                internalSuggestions.length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    Keine externen Vorschläge verfügbar oder sie konnten nicht
                    geladen werden.
                  </p>
                )}
              {!isLoadingSuggestions &&
                !suggestionsError &&
                internalSuggestions.length > 0 && (
                  // max-h für bessere Scrollbarkeit innerhalb dieses Abschnitts
                  <div className='overflow-y-auto pr-1 max-h-[250px] sm:max-h-[300px]'>
                    <EventList
                      events={internalSuggestions}
                      onProposeEvent={(itemOriginal) => {
                        // Finde das volle MixedEvent Objekt, um Datum usw. zu haben
                        const fullEvent = internalSuggestions.find(
                          (e) => e.original === itemOriginal
                        );
                        if (fullEvent) {
                          handleSuggestionClick(fullEvent);
                        } else {
                          // Fallback, falls nur das original Item übergeben wird und wir es nicht direkt finden
                          // Hier müsstest du entscheiden, wie du damit umgehst.
                          // Evtl. eine generische Behandlung für itemOriginal, wenn der Typ bekannt ist.
                          console.warn(
                            'Konnte volles Event-Objekt nicht finden für Vorschlag',
                            itemOriginal
                          );
                          toast.error('Fehler bei Übernahme des Vorschlags.');
                        }
                      }}
                      disabled={form.formState.isSubmitting || isAiLoading}
                    />
                  </div>
                )}
            </div>
          </div>{' '}
          {/* Ende innerer Container */}
        </div>{' '}
        {/* Ende Scrollbarer Hauptbereich */}
        <DialogFooter className='flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t mt-auto px-6 pb-6'>
          <DialogClose asChild>
            <Button type='button' variant='ghost' className='w-full sm:w-auto'>
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type='submit'
            form='add-event-form'
            disabled={
              form.formState.isSubmitting || isAiLoading || isLoadingSuggestions
            }
            className='w-full sm:w-auto'
          >
            {form.formState.isSubmitting ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : null}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
          <Button
            variant='outline'
            onClick={generateAiSuggestion}
            disabled={
              isAiLoading || form.formState.isSubmitting || isLoadingSuggestions
            }
            className='w-full sm:w-auto'
          >
            {isAiLoading ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Sparkles className='h-4 w-4 mr-2 text-purple-500' /> // AI Icon
            )}
            {isAiLoading ? 'Generiere...' : 'AI Vorschlag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
