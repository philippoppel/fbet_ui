'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { Button, type ButtonProps } from '@/app/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
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
import type { AiEventPayload } from '@/app/components/event/EventCard';

/*
  ---------------------------------------------------------------------------
  Helper utils
  ---------------------------------------------------------------------------
*/

/**
 * Very small heuristic: if every non‑empty line after the prompt looks like a number, we treat it as a numeric wildcard.
 * Otherwise we default to "text". This removes an extra field from the UI while still filling the DB correctly.
 */
const inferWildcardType = (
  prompt: string
): 'EXACT_SCORE' | 'ROUND_FINISH' | 'GENERIC' => {
  const numbersOnly = prompt
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .every((s) => /^-?\d+(?:[.,]\d+)?$/.test(s));

  // Beispiel-Mapping:
  if (numbersOnly) {
    return 'EXACT_SCORE'; // oder 'ROUND_FINISH' — je nachdem wie du es semantisch willst
  } else {
    return 'GENERIC';
  }
};

const extractAIFields = (text: string): Partial<AddEventFormData> => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = '';
  let question = '';
  let description = '';
  let wildcardPrompt = '';
  const options: string[] = [];

  type State = 'none' | 'options' | 'description' | 'wildcard';
  let state: State = 'none';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('titel:')) {
      title = line
        .substring(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      state = 'none';
    } else if (lower.startsWith('frage:')) {
      question = line
        .substring(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      state = 'none';
    } else if (lower.startsWith('beschreibung:')) {
      description = line.substring(line.indexOf(':') + 1).trim();
      state = 'description';
    } else if (lower.startsWith('optionen:')) {
      state = 'options';
    } else if (lower.startsWith('wildcard:')) {
      wildcardPrompt = line.substring(line.indexOf(':') + 1).trim();
      state = 'wildcard';
    } else if (state === 'options') {
      options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
    } else if (state === 'description') {
      description += `\n${line}`;
    } else if (state === 'wildcard') {
      wildcardPrompt += `\n${line}`;
    }
  }

  return {
    title: title.trim(),
    question: (question || title).trim(),
    description: description.trim(),
    options: options.join('\n'),
    has_wildcard: Boolean(wildcardPrompt),
    wildcard_prompt: wildcardPrompt.trim(),
    wildcard_type: wildcardPrompt ? inferWildcardType(wildcardPrompt) : '',
  };
};

const getDefaultDeadlineString = (eventDate?: Date): string => {
  const now = new Date();
  let deadline =
    eventDate && eventDate > now ? new Date(eventDate) : new Date();
  if (deadline <= now) {
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(23, 59, 0, 0);
  }
  const minDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (deadline < minDeadline) deadline = minDeadline;
  return new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

/*
  ---------------------------------------------------------------------------
  Component
  ---------------------------------------------------------------------------
*/

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

export const AddEventDialog = ({
  groupName,
  open,
  setOpen,
  form,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) => {
  /* ------------------ Local state ------------------ */
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MixedEvent[]>([]);

  /* ------------------ External hooks ------------------ */
  const {
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents,
    errors,
  } = useDashboardData();

  /* ------------------ Helpers ------------------ */
  const textareaBase =
    'flex w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring resize-none';

  const triggerTextareaResize = useCallback(() => {
    // react‑textarea‑autosize needs an input event to recalc height
    setTimeout(() => {
      document
        .querySelectorAll(
          'textarea[data-react-textarea-autosize="true"], input[type="datetime-local"]'
        )
        .forEach((el) =>
          el.dispatchEvent(new Event('input', { bubbles: true }))
        );
    });
  }, []);

  const resetForm = useCallback(() => {
    form.reset({
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
      has_wildcard: false,
      wildcard_prompt: '',
      wildcard_type: '',
    });
    triggerTextareaResize();
  }, [form, triggerTextareaResize]);

  /* ------------------ Effects ------------------ */
  useEffect(() => {
    if (open) {
      if (
        retrievedCombinedEvents.length === 0 &&
        !isLoadingCombinedEvents &&
        !errors.combinedEvents
      ) {
        loadCombinedEvents();
      }
      setSuggestions(retrievedCombinedEvents);
    }
  }, [
    open,
    retrievedCombinedEvents,
    isLoadingCombinedEvents,
    errors.combinedEvents,
    loadCombinedEvents,
  ]);

  /* ------------------ AI helpers ------------------ */
  const applyAiSuggestion = (data: any, msg: string) => {
    const extracted = extractAIFields(
      data.message || data.generated_bet_text || ''
    );

    // --> WICHTIG: Überschreibe wildcard_prompt, wenn explizit mitgekommen!
    if (data.wildcard_prompt) {
      extracted.wildcard_prompt = data.wildcard_prompt;
      extracted.has_wildcard = Boolean(data.wildcard_prompt?.trim());
      extracted.wildcard_type = data.wildcard_prompt
        ? inferWildcardType(data.wildcard_prompt)
        : '';
    }

    if (!extracted.title && !extracted.question) {
      toast.error('AI lieferte kein verwertbares Ergebnis');
      return;
    }

    const deadlineDate = data.event_bet_on?.date
      ? new Date(data.event_bet_on.date)
      : undefined;

    form.reset({
      title: extracted.title ?? '',
      question: extracted.question ?? '',
      description: extracted.description ?? '',
      options: extracted.options ?? '',
      tippingDeadline: getDefaultDeadlineString(deadlineDate),
      has_wildcard: extracted.has_wildcard,
      wildcard_prompt: extracted.wildcard_prompt ?? '',
      wildcard_type: extracted.wildcard_type ?? '',
    });

    triggerTextareaResize();
    toast.success(msg);
  };

  const handleAiGenerate = async (payload: AiEventPayload) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/generate-ai-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Status: ${res.status}`);
      }
      applyAiSuggestion(await res.json(), 'AI-Vorschlag übernommen');
    } catch (e: any) {
      toast.error('AI-Fehler', { description: e.message });
    } finally {
      setIsAiLoading(false);
    }
  };

  /* ------------------ Suggestion click ------------------ */
  const handleSuggestionClick = (id: string) => {
    const ev = suggestions.find((e) => e.id === id);
    if (!ev) return;

    // fallback values
    let title = ev.title;
    let question = 'Wer gewinnt?';
    let optionsArr: string[] = ['Option 1', 'Option 2'];
    let description = title;

    if (ev.sport === 'ufc' && ev.original) {
      const ufc = ev.original as UfcEventItem;
      const [f1, f2] = (ufc.summary ?? title).split(' vs ');
      question = `Wer gewinnt den Kampf ${ufc.summary}?`;
      optionsArr = [
        `${f1?.trim() || 'Kämpfer A'} gewinnt`,
        `${f2?.trim() || 'Kämpfer B'} gewinnt`,
      ];
      description = `UFC Fight: ${ufc.summary}\nOrt: ${ufc.location}\nDatum: ${ev.date.toLocaleString('de-DE')}`;
    } else if (ev.sport === 'boxing' && ev.original) {
      const box = ev.original as BoxingScheduleItem;
      const [b1, b2] = (box.details ?? title).split(' vs ');
      question = `Wer gewinnt ${box.details}?`;
      optionsArr = [
        `${b1?.trim() || 'Boxer A'} gewinnt`,
        `${b2?.trim() || 'Boxer B'} gewinnt`,
        'Unentschieden',
      ];
      description = `Boxkampf: ${box.details}\nOrt: ${box.location}\nDatum: ${ev.date.toLocaleString('de-DE')}`;
    } else if (ev.sport === 'football' && ev.original) {
      const foot = ev.original as FootballEvent;
      question = `Wie endet ${foot.homeTeam} vs ${foot.awayTeam}?`;
      optionsArr = [
        `${foot.homeTeam} gewinnt`,
        `${foot.awayTeam} gewinnt`,
        'Unentschieden',
      ];
      description = `Fußballspiel: ${foot.homeTeam} vs ${foot.awayTeam}\nWettbewerb: ${foot.competition}\nDatum: ${ev.date.toLocaleString('de-DE')}`;
    }

    form.reset({
      title: '',
      description: '',
      question: 'Wer gewinnt?',
      options: '',
      tippingDeadline: getDefaultDeadlineString(),
      has_wildcard: false,
      wildcard_prompt: '',
      wildcard_type: '',
    });
    triggerTextareaResize();
    toast.success('Vorschlag übernommen');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Trage die Details ein oder übernimm einen Vorschlag.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-grow overflow-y-auto px-1 pr-3 scrollbar-thin scrollbar-thumb-muted-foreground/50'>
          <div className='px-6 py-4'>
            <Form {...form}>
              <form
                id='add-event-form'
                className='space-y-6'
                // NEUER CODE MIT DEBUGGING
                onSubmit={form.handleSubmit(
                  // 1. Das ist deine Funktion für den Erfolgsfall
                  (vals) => {
                    console.log(
                      '✅ Formular-Validierung ERFOLGREICH. Werte:',
                      vals
                    );

                    vals.has_wildcard = Boolean(vals.wildcard_prompt?.trim());
                    vals.wildcard_type = vals.has_wildcard
                      ? inferWildcardType(vals.wildcard_prompt || '')
                      : '';

                    console.log('Werte nach Aufbereitung:', vals);
                    console.log(
                      'Rufe jetzt die übergebene onSubmit-Funktion auf...'
                    );

                    onSubmit(vals);
                  },
                  // 2. DAS IST DER ENTSCHEIDENDE TEIL: Die Funktion für den Fehlerfall
                  (errors) => {
                    console.error(
                      '❌ Formular-Validierung FEHLGESCHLAGEN. Fehler:',
                      errors
                    );
                    toast.error('Validierungsfehler', {
                      description:
                        'Bitte überprüfe die Formularfelder. Details sind in der Konsole.',
                    });
                  }
                )}
              >
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          minRows={1}
                          maxRows={3}
                          className={textareaBase}
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
                      <FormLabel>Beschreibung</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          minRows={2}
                          maxRows={5}
                          className={textareaBase}
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
                            minRows={1}
                            maxRows={3}
                            className={textareaBase}
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
                            minRows={3}
                            maxRows={6}
                            placeholder='Option 1\nOption 2'
                            className={`${textareaBase} whitespace-pre-wrap`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Eine Option pro Zeile (mind. 2)
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
                      <FormLabel>Deadline</FormLabel>
                      <FormControl>
                        <Input type='datetime-local' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='wildcard_prompt'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wildcard-Prompt (optional)</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          minRows={1}
                          maxRows={3}
                          placeholder='Optional: Wildcard-Frage oder Zusatz (z. B. "Wie viele Runden?")'
                          className={textareaBase}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Wenn du hier etwas einträgst, wird automatisch eine
                        Wildcard aktiviert. Wenn das Feld leer bleibt, gibt es
                        keine Wildcard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>

              {/* Suggestions & AI Block → außerhalb von <form> */}
              <div className='mt-8 pt-6 border-t'>
                <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                  <Sparkles className='w-5 h-5 text-purple-500' />
                  Event‑Vorschläge & AI‑Assistenz
                </h3>

                {isLoadingCombinedEvents && (
                  <div className='flex items-center justify-center py-4 text-muted-foreground'>
                    <Loader2 className='h-5 w-5 animate-spin mr-2' /> Lade
                    Vorschläge…
                  </div>
                )}

                {errors.combinedEvents && !isLoadingCombinedEvents && (
                  <div className='my-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive'>
                    <div className='flex items-start gap-3'>
                      <AlertTriangle className='h-5 w-5 flex-shrink-0' />
                      <div>
                        <p className='font-semibold mb-1'>
                          Fehler beim Laden der Vorschläge
                        </p>
                        <p className='text-xs mb-3'>{errors.combinedEvents}</p>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={loadCombinedEvents}
                          disabled={isLoadingCombinedEvents}
                          className='border-destructive text-destructive hover:bg-destructive/20 hover:text-destructive'
                        >
                          {isLoadingCombinedEvents && (
                            <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                          )}
                          Erneut versuchen
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoadingCombinedEvents &&
                  !errors.combinedEvents &&
                  suggestions.length === 0 && (
                    <p className='text-sm text-muted-foreground text-center py-4'>
                      Keine Event‑Vorschläge gefunden.
                    </p>
                  )}

                {!isLoadingCombinedEvents &&
                  !errors.combinedEvents &&
                  suggestions.length > 0 && (
                    <div className='overflow-y-auto pr-1 max-h-[250px] sm:max-h-[300px] space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/50'>
                      <EventList
                        events={suggestions}
                        onProposeEvent={handleSuggestionClick}
                        onCardAiCreate={handleAiGenerate}
                        disabled={
                          !form.formState.isValid ||
                          form.formState.isSubmitting ||
                          isAiLoading ||
                          isLoadingCombinedEvents
                        }
                      />
                    </div>
                  )}
              </div>
            </Form>
          </div>
        </div>

        <DialogFooter className='mt-auto border-t pt-4 px-6 flex flex-col-reverse sm:flex-row gap-2'>
          <DialogClose asChild>
            <Button variant='ghost' className='w-full sm:w-auto'>
              Abbrechen
            </Button>
          </DialogClose>

          <Button
            type='submit'
            form='add-event-form' // damit der submit korrekt funktioniert
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
            {form.formState.isSubmitting ? 'Erstelle …' : 'Event erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
