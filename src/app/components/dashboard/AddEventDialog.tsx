// src/components/dashboard/AddEventDialog.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles, AlertTriangle } from 'lucide-react'; // AlertTriangle für Fehler
import { EventList } from '@/app/components/dashboard/EventList';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type {
  MixedEvent,
  UfcEventItem,
  BoxingScheduleItem,
} from '@/app/lib/types';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import { getUfcSchedule, getBoxingSchedule } from '@/app/lib/api'; // API-Funktionen importieren
// cn wird hier nicht direkt verwendet, kann aber für zukünftige Anpassungen bleiben
// import { cn } from '@/app/lib/utils';

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

// Hilfsfunktion zum Parsen von Daten (ähnlich wie in useDashboardData)
// Diese könnte auch in eine utils-Datei ausgelagert werden, wenn sie öfter gebraucht wird.
const parseDateForSuggestions = (dateStr: string | null | undefined): Date => {
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
    `[parseDateForSuggestions] Konnte Datum nicht parsen: "${dateStr}".`
  );
  return new Date(0);
};

export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) {
  const [internalSuggestions, setInternalSuggestions] = useState<MixedEvent[]>(
    []
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    // Nur laden, wenn noch keine Vorschläge da sind und nicht bereits geladen wird
    if (internalSuggestions.length > 0 || isLoadingSuggestions) {
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const [ufcResult, boxingResult] = await Promise.allSettled([
        getUfcSchedule(),
        getBoxingSchedule(),
      ]);

      let ufcEventsData: UfcEventItem[] = [];
      let boxingEventsData: BoxingScheduleItem[] = [];

      if (ufcResult.status === 'fulfilled') {
        ufcEventsData = ufcResult.value;
      } else {
        console.error('Fehler beim Laden der UFC Events:', ufcResult.reason);
        // Optional: spezifischen Fehler für UFC setzen
      }

      if (boxingResult.status === 'fulfilled') {
        boxingEventsData = boxingResult.value;
      } else {
        console.error(
          'Fehler beim Laden der Boxing Events:',
          boxingResult.reason
        );
        // Optional: spezifischen Fehler für Boxing setzen
      }

      if (
        ufcResult.status === 'rejected' &&
        boxingResult.status === 'rejected'
      ) {
        setSuggestionsError(
          'Fehler beim Laden aller externen Event-Vorschläge.'
        );
      } else if (ufcResult.status === 'rejected') {
        setSuggestionsError('Fehler beim Laden der UFC Event-Vorschläge.');
      } else if (boxingResult.status === 'rejected') {
        setSuggestionsError('Fehler beim Laden der Box-Event-Vorschläge.');
      }

      const ufcMapped = ufcEventsData.map((e, i) => {
        const parsedDate = parseDateForSuggestions(e.dtstart);
        return {
          id: e.uid || `${e.summary?.replace(/\s+/g, '-')}-${e.dtstart || i}`,
          title: e.summary || 'Unbekanntes UFC Event',
          subtitle: `${parsedDate.getFullYear() > 1970 ? parsedDate.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '?'} – ${e.location || '?'}`,
          sport: 'ufc' as const,
          date: parsedDate,
          original: e,
        };
      });

      const boxingMapped = boxingEventsData.map((e, i) => {
        const parsedDate = parseDateForSuggestions(e.date);
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
      const sortedEvents = validEvents.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
      setInternalSuggestions(sortedEvents);
    } catch (error) {
      console.error('Generischer Fehler beim Laden der Vorschläge:', error);
      setSuggestionsError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [internalSuggestions.length, isLoadingSuggestions]); // Abhängigkeiten

  useEffect(() => {
    if (
      open &&
      internalSuggestions.length === 0 &&
      !isLoadingSuggestions &&
      !suggestionsError
    ) {
      loadSuggestions();
    }
  }, [
    open,
    internalSuggestions.length,
    isLoadingSuggestions,
    suggestionsError,
    loadSuggestions,
  ]);

  const handleSuggestionClick = (
    suggestionItem: UfcEventItem | BoxingScheduleItem
  ) => {
    let title = 'Event Titel';
    const options = ['1', '2', 'X']; // Standardoptionen
    const question = 'Wer gewinnt?'; // Standardfrage

    // Titel aus dem Vorschlag extrahieren
    if ('details' in suggestionItem && suggestionItem.details) {
      // Boxing
      title = suggestionItem.details;
    } else if ('summary' in suggestionItem && suggestionItem.summary) {
      // UFC
      title = suggestionItem.summary;
    }

    form.reset(
      {
        title: title.slice(0, 250), // Max Länge für Titel
        question,
        options: options.join('\n'),
        description: `Externes Event: ${title}`.slice(0, 500), // Max Länge für Beschreibung
      },
      { keepErrors: true, keepDirty: true, keepTouched: true }
    );

    toast.success('Vorschlag übernommen', {
      description: `"${title}" wurde ins Formular eingetragen.`,
    });
  };

  const defaultTrigger = (
    <Button size='sm' variant='ghost' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' />
      Neue Wette
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps} variant='ghost'>
            {triggerProps.children || (
              <>
                <PlusCircle className='mr-2 h-4 w-4' />
                Neues Event
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
            Manuell anlegen oder Vorschlag übernehmen.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-grow overflow-y-auto pr-6 -mr-6 pl-6 -ml-6'>
          <Form {...form}>
            <form id='add-event-form' className='space-y-4 pt-4'>
              {/* FormFields bleiben unverändert */}
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <Input placeholder='Fight Night …' {...field} />
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
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea placeholder='Optional …' rows={2} {...field} />
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
                        <Input placeholder='Wer gewinnt?' {...field} />
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
                        <Textarea
                          placeholder={`Option 1\nOption 2\n...`}
                          rows={3}
                          className='whitespace-pre-wrap'
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
            </form>
          </Form>

          <div className='mt-6 pt-6 border-t'>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Sparkles className='w-5 h-5 text-muted-foreground' />
              Vorschläge übernehmen
            </h3>
            {isLoadingSuggestions && (
              <div className='flex items-center justify-center py-4 text-muted-foreground'>
                <Loader2 className='h-5 w-5 animate-spin mr-2' />
                <span>Lade Vorschläge...</span>
              </div>
            )}
            {suggestionsError && !isLoadingSuggestions && (
              <div className='flex flex-col items-center justify-center py-4 text-destructive'>
                <AlertTriangle className='h-8 w-8 mb-2' />
                <p className='font-medium'>Fehler beim Laden der Vorschläge</p>
                <p className='text-sm text-center'>{suggestionsError}</p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={loadSuggestions}
                  className='mt-3'
                >
                  Erneut versuchen
                </Button>
              </div>
            )}
            {!isLoadingSuggestions &&
              !suggestionsError &&
              internalSuggestions.length === 0 && (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  Keine Vorschläge verfügbar oder sie konnten nicht geladen
                  werden.
                </p>
              )}
            {!isLoadingSuggestions &&
              !suggestionsError &&
              internalSuggestions.length > 0 && (
                <div className='overflow-y-auto pr-3 max-h-[300px]'>
                  {/* max-h hinzugefügt für bessere Scrollbarkeit */}
                  <EventList
                    events={internalSuggestions}
                    onProposeEvent={handleSuggestionClick}
                    disabled={false} // oder form.formState.isSubmitting, falls gewünscht
                  />
                </div>
              )}
          </div>
        </div>

        <DialogFooter className='sm:justify-end pt-4 flex-shrink-0'>
          <DialogClose asChild>
            <Button type='button' variant='ghost'>
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type='submit'
            form='add-event-form'
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)} // Stelle sicher, dass onSubmit hier korrekt verwendet wird
            className='hover:bg-primary/90 transition-colors'
          >
            {form.formState.isSubmitting && (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            )}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
