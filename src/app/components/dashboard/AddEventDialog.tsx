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
  MixedEvent,
  UfcEventItem,
  BoxingScheduleItem,
  FootballEvent,
} from '@/app/lib/types';
import { EventList } from '@/app/components/dashboard/EventList';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import type { AiEventPayload } from '@/app/components/event/EventCard'; // Import für den Payload-Typ

const extractAIFields = (text: string): Partial<AddEventFormData> => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let title = '',
    question = '',
    description = '';
  let options: string[] = [];
  let parsingState: 'none' | 'options' | 'description' = 'none';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('titel:')) {
      title = line
        .substring(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      parsingState = 'none';
    } else if (lowerLine.startsWith('frage:')) {
      question = line
        .substring(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      parsingState = 'none';
    } else if (lowerLine.startsWith('optionen:')) {
      parsingState = 'options';
    } else if (lowerLine.startsWith('beschreibung:')) {
      description = line.substring(line.indexOf(':') + 1).trim();
      parsingState = 'description';
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
        parsingState = 'none';
      }
    } else if (parsingState === 'description') {
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) =>
          lowerLine.startsWith(kw)
        )
      ) {
        description += '\n' + line;
      } else {
        parsingState = 'none';
      }
    }
  }
  return {
    title: title.trim(),
    question: question.trim() || title.trim(),
    description: description.trim(),
    options: options.join('\n'),
  };
};

const getDefaultDeadlineString = (eventDateInput?: Date): string => {
  const now = new Date();
  let deadlineDate: Date;

  if (eventDateInput && eventDateInput.getTime() > now.getTime()) {
    deadlineDate = new Date(eventDateInput);
  } else {
    deadlineDate = new Date(now);
    if (eventDateInput && eventDateInput.getTime() <= now.getTime()) {
      deadlineDate.setDate(deadlineDate.getDate() + 7);
    } else if (!eventDateInput) {
      deadlineDate.setDate(deadlineDate.getDate() + 1);
    }
    deadlineDate.setHours(23, 59, 0, 0);
  }

  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (deadlineDate.getTime() < twoHoursFromNow.getTime()) {
    deadlineDate = twoHoursFromNow;
  }

  const offset = deadlineDate.getTimezoneOffset();
  const localDeadline = new Date(deadlineDate.getTime() - offset * 60000);
  return localDeadline.toISOString().slice(0, 16);
};

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

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
  const {
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents,
    errors: dashboardErrors,
  } = useDashboardData();

  const triggerTextareaResize = useCallback(() => {
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
  }, []);

  const resetFormToDefaults = useCallback(() => {
    form.reset({
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
    });
    triggerTextareaResize();
  }, [form, triggerTextareaResize]);

  useEffect(() => {
    if (open) {
      if (
        retrievedCombinedEvents.length === 0 &&
        !isLoadingCombinedEvents &&
        !dashboardErrors.combinedEvents
      ) {
        loadCombinedEvents();
      }
      setInternalSuggestions(retrievedCombinedEvents);
    }
  }, [
    open,
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents,
    dashboardErrors.combinedEvents,
  ]);

  const processAndApplyAiSuggestion = (
    aiResponseData: any, // Typ sollte genauer sein, z.B. { message: string, event_bet_on?: { date?: string } }
    successMessage: string
  ) => {
    const aiBetText =
      aiResponseData.message || aiResponseData.generated_bet_text || '';
    const suggestion = extractAIFields(aiBetText);

    if (!suggestion.title && !suggestion.question) {
      toast.error('AI konnte keine gültige Wette erzeugen.', {
        description: 'Das Format der AI-Antwort war unerwartet.',
      });
      return;
    }

    const eventDateForDeadline = aiResponseData.event_bet_on?.date
      ? new Date(aiResponseData.event_bet_on.date)
      : undefined;

    form.reset({
      title: suggestion.title || '',
      question: suggestion.question || suggestion.title || '',
      description: suggestion.description || '',
      options: suggestion.options || '',
      tippingDeadline: getDefaultDeadlineString(eventDateForDeadline),
    });
    triggerTextareaResize();
    toast.success(successMessage);
  };

  const generateRandomAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      // Der GET-Request an dieselbe Route führt zur Generierung eines zufälligen Events
      const res = await fetch('/api/generate-ai-bet', { method: 'GET' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `API-Fehler: ${res.status}`);
      }
      const data = await res.json();
      processAndApplyAiSuggestion(data, 'Zufälliger AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler bei zufälliger AI-Wette:', error);
      toast.error('Fehler bei der zufälligen AI-Wette.', {
        description: error.message || 'Unbekannter Fehler.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiGenerateForSpecificEvent = async (payload: AiEventPayload) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/generate-ai-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error('API-Fehler beim Generieren der Wette für dieses Event.', {
          description: errorData.error || `Status: ${res.status}`,
        });
        throw new Error(errorData.error || `API-Fehler: ${res.status}`);
      }
      const data = await res.json();
      processAndApplyAiSuggestion(
        data,
        'AI-Vorschlag für ausgewähltes Event eingefügt!'
      );
    } catch (error: any) {
      console.error('Fehler bei AI-Wette für spezifisches Event:', error);
      toast.error('Fehler bei der AI-Wette für spezifisches Event.', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestionClick = (suggestedEventId: string) => {
    const eventToUse = internalSuggestions.find(
      (e) => e.id === suggestedEventId
    );
    if (!eventToUse) {
      toast.error('Fehler bei Übernahme des Vorschlags.');
      return;
    }

    let title = eventToUse.title;
    let description = `Vorgeschlagenes Event: ${title}`;
    let question = 'Wer gewinnt?';
    let optionsArray: string[] = [];

    if (eventToUse.sport === 'ufc' && eventToUse.original) {
      const ufcItem = eventToUse.original as UfcEventItem;
      question = `Wer gewinnt den Kampf: ${ufcItem.summary || title}?`;
      const fighters = ufcItem.summary?.split(' vs ');
      optionsArray =
        fighters && fighters.length === 2
          ? [`${fighters[0].trim()} gewinnt`, `${fighters[1].trim()} gewinnt`]
          : ['Kämpfer 1 gewinnt', 'Kämpfer 2 gewinnt'];
      description = `UFC Event: ${ufcItem.summary || title}\nOrt: ${ufcItem.location || 'N/A'}\nDatum: ${eventToUse.date.toLocaleString('de-DE')}`;
    } else if (eventToUse.sport === 'boxing' && eventToUse.original) {
      const boxingItem = eventToUse.original as BoxingScheduleItem;
      question = `Wer gewinnt den Boxkampf: ${boxingItem.details || title}?`;
      const fighters = boxingItem.details?.split(' vs ');
      optionsArray =
        fighters && fighters.length === 2
          ? [
              `${fighters[0].trim()} gewinnt`,
              `${fighters[1].trim()} gewinnt`,
              'Unentschieden',
            ]
          : ['Boxer 1 gewinnt', 'Boxer 2 gewinnt', 'Unentschieden'];
      description = `Boxkampf: ${boxingItem.details || title}\nOrt: ${boxingItem.location || 'N/A'}${boxingItem.broadcaster ? `, Übertragung: ${boxingItem.broadcaster}` : ''}\nDatum: ${eventToUse.date.toLocaleString('de-DE')}`;
    } else if (eventToUse.sport === 'football' && eventToUse.original) {
      const footballItem = eventToUse.original as FootballEvent;
      question = `Wie endet das Spiel ${footballItem.homeTeam} vs ${footballItem.awayTeam}?`;
      optionsArray = [
        `${footballItem.homeTeam} gewinnt`,
        `${footballItem.awayTeam} gewinnt`,
        'Unentschieden',
      ];
      description = `Fußballspiel: ${title}\nWettbewerb: ${footballItem.competition}\nDatum: ${eventToUse.date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}`;
    } else {
      optionsArray = ['Option 1', 'Option 2'];
    }

    form.reset({
      title: title.slice(0, 250),
      question: question.slice(0, 250),
      options: optionsArray.join('\n'),
      description: description.slice(0, 500),
      tippingDeadline: getDefaultDeadlineString(eventToUse.date),
    });
    triggerTextareaResize();
    toast.success('Vorschlag übernommen', {
      description: `"${title}" wurde ins Formular eingetragen. Deadline: ${form.getValues('tippingDeadline').replace('T', ' ')}`,
    });
  };

  const defaultTrigger = (
    <Button size='sm' variant='outline' className='whitespace-nowrap'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette vorschlagen
    </Button>
  );

  const textareaBaseClasses =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetFormToDefaults();
      }}
    >
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps} variant={triggerProps.variant || 'default'}>
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
          <DialogTitle>Neues Event für „{groupName}“ erstellen</DialogTitle>
          <DialogDescription>
            Fülle die Felder manuell aus, nutze einen AI-Vorschlag oder wähle
            ein Event aus der Liste.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-grow overflow-y-auto px-1 pr-3 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent'>
          <div className='px-6 py-4'>
            <Form {...form}>
              <form
                id='add-event-form'
                className='space-y-6'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel des Events</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          placeholder='z.B. Nächstes F1 Rennen, Bundesliga Spieltag'
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
                          placeholder='Weitere Details, Regeln oder Kontext zum Event'
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
                <div className='grid md:grid-cols-2 gap-x-4 gap-y-6'>
                  <FormField
                    control={form.control}
                    name='question'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipp-Frage</FormLabel>
                        <FormControl>
                          <TextareaAutosize
                            placeholder='Wer gewinnt? Wie lautet das Ergebnis?'
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
                        <FormLabel>Antwort-Optionen</FormLabel>
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
                          Eine Option pro Zeile (mind. 2).
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
            <div className='mt-8 pt-6 border-t'>
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <Sparkles className='w-5 h-5 text-purple-500' />{' '}
                Event-Vorschläge
              </h3>
              {isLoadingCombinedEvents && (
                <div className='flex items-center justify-center py-4 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' /> Lade
                  Vorschläge...
                </div>
              )}
              {dashboardErrors.combinedEvents && !isLoadingCombinedEvents && (
                <div className='my-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive'>
                  <div className='flex items-start gap-3'>
                    <AlertTriangle className='h-5 w-5 flex-shrink-0' />
                    <div>
                      <p className='font-semibold mb-1'>
                        Fehler beim Laden der Vorschläge
                      </p>
                      <p className='text-xs mb-3'>
                        {dashboardErrors.combinedEvents}
                      </p>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={loadCombinedEvents}
                        disabled={isLoadingCombinedEvents}
                        className='border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive'
                      >
                        {isLoadingCombinedEvents && (
                          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                        )}{' '}
                        Erneut versuchen
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!isLoadingCombinedEvents &&
                !dashboardErrors.combinedEvents &&
                internalSuggestions.length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-4'>
                    Keine externen Event-Vorschläge für den aktuellen Zeitraum
                    gefunden.
                  </p>
                )}
              {!isLoadingCombinedEvents &&
                !dashboardErrors.combinedEvents &&
                internalSuggestions.length > 0 && (
                  <div className='overflow-y-auto pr-1 max-h-[250px] sm:max-h-[300px] space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent'>
                    <EventList
                      events={internalSuggestions}
                      onProposeEvent={handleSuggestionClick}
                      onCardAiCreate={handleAiGenerateForSpecificEvent} // Hier den neuen Handler übergeben
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

        <DialogFooter className='flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-4 border-t mt-auto px-6 pb-6'>
          <Button
            variant='outline'
            onClick={generateRandomAiSuggestion} // Umbenannt für Klarheit: Dies ist für zufällige Vorschläge
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
            {isAiLoading ? 'Generiere...' : 'Zufälliger AI Vorschlag'}
          </Button>
          <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full sm:w-auto'>
            <DialogClose asChild>
              <Button
                type='button'
                variant='ghost'
                className='w-full sm:w-auto'
              >
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
              {form.formState.isSubmitting && (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              )}
              {form.formState.isSubmitting
                ? 'Erstelle Event…'
                : 'Event erstellen'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
