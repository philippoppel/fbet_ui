// src/components/dashboard/AddEventDialog.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import TextareaAutosize from 'react-textarea-autosize';
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
import type {
  BoxingScheduleItem,
  MixedEvent,
  UfcEventItem,
} from '@/app/lib/types'; // UfcEventItem, BoxingScheduleItem werden indirekt über MixedEvent.original behandelt
import { EventList } from '@/app/components/dashboard/EventList';
import { useDashboardData } from '@/app/hooks/useDashboardData';

// --- HILFSFUNKTIONEN ---

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
    if (lowerLine.startsWith('titel:')) {
      // Startswith ist robuster
      title = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.startsWith('frage:')) {
      question = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.startsWith('optionen:')) {
      parsingState = 'options';
    } else if (lowerLine.startsWith('beschreibung:')) {
      description = line.split(':').slice(1).join(':').trim();
      parsingState = 'description'; // Wichtig: State hier setzen
    } else if (parsingState === 'options') {
      if (line.match(/^(\*|\-|\d+\.|[A-Z]\))\s+/)) {
        options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
      } else if (
        line.length > 0 &&
        !['titel:', 'frage:', 'beschreibung:', 'optionen:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        options.push(line.trim());
      } else if (
        ['titel:', 'frage:', 'beschreibung:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        // Wenn ein neues Feld beginnt, Optionen beenden und Zeile neu verarbeiten
        parsingState = 'none';
        // Hier könnte man die Zeile ggf. in der nächsten Iteration neu verarbeiten oder den Index zurücksetzen.
        // Für Einfachheit: Aktuelle Zeile wird ignoriert, wenn sie ein neues Feld einleitet.
      }
    } else if (parsingState === 'description') {
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        description += '\n' + line;
      } else {
        // Wenn ein neues Feld beginnt, Beschreibung beenden
        parsingState = 'none';
        // Ggf. Zeile neu verarbeiten
      }
    }
  }
  description = description.trim();
  return {
    title: title,
    question: question || title, // Fallback, falls keine explizite Frage
    description: description,
    options: options.join('\n'),
  };
};

const getDefaultDeadlineString = (date?: Date): string => {
  const now = new Date();
  let targetDate: Date;

  if (date && date.getTime() > now.getTime()) {
    // Wenn ein gültiges Zukunftsdatum übergeben wird, dieses verwenden
    targetDate = new Date(date);
  } else {
    // Andernfalls Standard: aktuelles Datum + 1 Monat (oder das Event-Datum, falls es in der Vergangenheit liegt)
    targetDate = new Date(date || now); // Nimm Event-Datum als Basis, auch wenn vergangen, oder jetzt
    if (!date || date.getTime() <= now.getTime()) {
      // Wenn kein Datum oder vergangenes Datum, dann +1 Monat ab jetzt
      targetDate = new Date(); // Zurücksetzen auf jetzt für +1 Monat Logik
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
  }
  // Sicherstellen, dass die Deadline mindestens ein paar Stunden in der Zukunft liegt, falls Event-Datum sehr nah ist
  if (targetDate.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    // Weniger als 2 Stunden
    targetDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Setze auf 2 Stunden in der Zukunft
  }

  const offset = targetDate.getTimezoneOffset();
  const localDate = new Date(targetDate.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
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
  const [internalSuggestions, setInternalSuggestions] = useState<MixedEvent[]>(
    []
  );

  // Verwende useDashboardData für Ladezustand und Fehler von kombinierten Events
  const {
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents, // von useDashboardData
    errors: dashboardErrors, // von useDashboardData
  } = useDashboardData();

  const resetFormToDefaults = useCallback(() => {
    form.reset({
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
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
            /* ignore */
          }
        });
    }, 0);
  }, [form]);

  // useEffect zum Laden/Übernehmen der kombinierten Event-Vorschläge
  useEffect(() => {
    if (open) {
      if (
        retrievedCombinedEvents.length === 0 &&
        !isLoadingCombinedEvents &&
        !dashboardErrors.combinedEvents
      ) {
        // Nur laden, wenn noch nicht geladen, nicht gerade lädt und kein Fehler vorliegt.
        loadCombinedEvents();
      }
      // Setze internalSuggestions immer, wenn retrievedCombinedEvents sich ändert und der Dialog offen ist.
      // Das Filtern nach gültigem Datum (getFullYear > 1970) geschieht bereits in useDashboardData.
      setInternalSuggestions(retrievedCombinedEvents);
    }
  }, [
    open,
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents,
    dashboardErrors.combinedEvents,
  ]);

  const generateAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/generate-ai-bet', { method: 'GET' });

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

      const data = await res.json(); // Erwartet { generated_bet_text: string, event_bet_on: GenericEvent }

      // data.message für Kompatibilität mit der alten AI-Endpunkt-Antwort
      const aiBetText = data.generated_bet_text || data.message || '';
      const suggestion = extractAIFields(aiBetText);

      if (!suggestion.title && !suggestion.question) {
        toast.error('AI konnte keine gültige Wette erzeugen.', {
          description: 'Das Format der AI-Antwort war unerwartet.',
        });
        return;
      }

      let eventDateForDeadline: Date | undefined = undefined;
      if (data.event_bet_on && data.event_bet_on.date) {
        eventDateForDeadline = new Date(data.event_bet_on.date);
      }

      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '',
        description: suggestion.description || '',
        options: suggestion.options || '',
        tippingDeadline: getDefaultDeadlineString(eventDateForDeadline),
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
              /* ignore */
            }
          });
      }, 0);
      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler bei AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        description: error.message || 'Unbekannter Fehler.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestionClick = (suggestedEventId: string) => {
    // Erwartet jetzt die ID des MixedEvent
    const eventToUse = internalSuggestions.find(
      (e) => e.id === suggestedEventId
    );

    if (!eventToUse) {
      console.warn(
        'Konnte volles Event-Objekt nicht über ID finden für Vorschlag:',
        suggestedEventId
      );
      toast.error('Fehler bei Übernahme des Vorschlags.');
      return;
    }

    let title = eventToUse.title || 'Event Titel';
    let description = `Vorgeschlagenes Event: ${title}`;
    let question = 'Wer gewinnt?';
    let optionsArray = ['Team 1 gewinnt', 'Team 2 gewinnt', 'Unentschieden'];

    if (eventToUse.sport === 'ufc' && eventToUse.original) {
      const ufcItem = eventToUse.original as UfcEventItem;
      const fighters = ufcItem.summary?.split(' vs ');
      if (fighters && fighters.length === 2) {
        optionsArray = [
          `${fighters[0].trim()} gewinnt`,
          `${fighters[1].trim()} gewinnt`,
        ];
        // Im UFC ist Unentschieden sehr selten, besonders bei Hauptkämpfen. Man könnte es weglassen.
        // if (!ufcItem.summary?.toLowerCase().includes('main event')) {
        //   optionsArray.push('Unentschieden (Draw)');
        // }
      }
      description = `UFC Event: ${ufcItem.summary || title}\nOrt: ${ufcItem.location || 'N/A'}`;
      question = `Wer gewinnt den Kampf: ${ufcItem.summary || title}?`;
    } else if (eventToUse.sport === 'boxing' && eventToUse.original) {
      const boxingItem = eventToUse.original as BoxingScheduleItem;
      const fighters = boxingItem.details?.split(' vs ');
      if (fighters && fighters.length === 2) {
        optionsArray = [
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
      options: optionsArray.join('\n'),
      description: description.slice(0, 500),
      tippingDeadline: getDefaultDeadlineString(eventToUse.date),
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
            /* ignore */
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
          resetFormToDefaults();
        }
      }}
    >
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps} variant={triggerProps.variant || 'ghost'}>
            {' '}
            {/* variant fallback */}
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

        <div className='flex-grow overflow-y-auto px-1 pr-3'>
          <div className='px-6 pt-2 pb-4'>
            <Form {...form}>
              <form
                id='add-event-form'
                className='space-y-4'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                {/* FormFields ... (wie vorher) */}
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

            <div className='mt-6 pt-6 border-t'>
              <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                <Sparkles className='w-5 h-5 text-muted-foreground' />
                Event-Vorschläge übernehmen
              </h3>
              {isLoadingCombinedEvents && ( // Verwende Ladezustand vom Hook
                <div className='flex items-center justify-center py-4 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' />
                  <span>Lade Vorschläge...</span>
                </div>
              )}
              {dashboardErrors.combinedEvents &&
                !isLoadingCombinedEvents && ( // Verwende Fehler vom Hook
                  <div className='flex flex-col items-center justify-center py-4 text-destructive bg-destructive/10 rounded-md p-4'>
                    <AlertTriangle className='h-8 w-8 mb-2' />
                    <p className='font-medium'>
                      Fehler beim Laden der Vorschläge
                    </p>
                    <p className='text-sm text-center mb-3'>
                      {dashboardErrors.combinedEvents}
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={loadCombinedEvents}
                      disabled={isLoadingCombinedEvents}
                    >
                      {isLoadingCombinedEvents ? (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      ) : null}
                      Erneut versuchen
                    </Button>
                  </div>
                )}
              {!isLoadingCombinedEvents &&
                !dashboardErrors.combinedEvents &&
                internalSuggestions.length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    Keine externen Event-Vorschläge verfügbar.
                  </p>
                )}
              {!isLoadingCombinedEvents &&
                !dashboardErrors.combinedEvents &&
                internalSuggestions.length > 0 && (
                  <div className='overflow-y-auto pr-1 max-h-[250px] sm:max-h-[300px]'>
                    <EventList
                      events={internalSuggestions}
                      onProposeEvent={(eventId) =>
                        handleSuggestionClick(eventId)
                      } // Übergibt jetzt die ID
                      disabled={
                        form.formState.isSubmitting ||
                        isAiLoading ||
                        isLoadingCombinedEvents
                      }
                    />
                  </div>
                )}
            </div>
          </div>
        </div>

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
              form.formState.isSubmitting ||
              isAiLoading ||
              isLoadingCombinedEvents
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
              isAiLoading ||
              form.formState.isSubmitting ||
              isLoadingCombinedEvents
            }
            className='w-full sm:w-auto'
          >
            {isAiLoading ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Sparkles className='h-4 w-4 mr-2 text-purple-500' />
            )}
            {isAiLoading ? 'Generiere...' : 'AI Vorschlag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
