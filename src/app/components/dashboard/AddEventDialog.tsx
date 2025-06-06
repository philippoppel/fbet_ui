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
import type { AiEventPayload } from '@/app/components/event/EventCard';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const extractAIFields = (text: string): Partial<AddEventFormData> => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = '',
    question = '',
    description = '';
  const options: string[] = [];
  let state: 'none' | 'options' | 'description' = 'none';

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith('titel:')) {
      title = line
        .slice(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      state = 'none';
    } else if (lower.startsWith('frage:')) {
      question = line
        .slice(line.indexOf(':') + 1)
        .trim()
        .replace(/^"|"$/g, '');
      state = 'none';
    } else if (lower.startsWith('optionen:')) {
      state = 'options';
    } else if (lower.startsWith('beschreibung:')) {
      description = line.slice(line.indexOf(':') + 1).trim();
      state = 'description';
    } else if (state === 'options') {
      options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
    } else if (state === 'description') {
      description += `\n${line}`;
    }
  });

  return {
    title: title.trim(),
    question: (question || title).trim(),
    description: description.trim(),
    options: options.join('\n'),
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

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MixedEvent[]>([]);

  const {
    retrievedCombinedEvents,
    loadCombinedEvents,
    isLoadingCombinedEvents,
    errors,
  } = useDashboardData();

  /* ---------- Helpers ---------- */

  const textareaBase =
    'flex w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring resize-none';

  const triggerTextareaResize = useCallback(() => {
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
    });
    triggerTextareaResize();
  }, [form, triggerTextareaResize]);

  /* ---------- Effects ---------- */

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

  /* ---------- AI ---------- */

  const applyAiSuggestion = (data: any, msg: string) => {
    const extracted = extractAIFields(
      data.message || data.generated_bet_text || ''
    );
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

  /* ---------- Suggestion click ---------- */

  const handleSuggestionClick = (id: string) => {
    const ev = suggestions.find((s) => s.id === id);
    if (!ev) return toast.error('Vorschlag nicht gefunden');

    let title = ev.title;
    let question = 'Wer gewinnt?';
    let desc = `Vorgeschlagenes Event: ${title}`;
    let opts: string[] = [];

    if (ev.sport === 'ufc' && ev.original) {
      const u = ev.original as UfcEventItem;
      question = `Wer gewinnt den Kampf: ${u.summary || title}?`;
      const fighters = u.summary?.split(' vs ');
      opts =
        fighters?.length === 2
          ? [`${fighters[0].trim()} gewinnt`, `${fighters[1].trim()} gewinnt`]
          : ['Kämpfer 1 gewinnt', 'Kämpfer 2 gewinnt'];
      desc = `UFC: ${u.summary}\nOrt: ${u.location}\nDatum: ${ev.date.toLocaleString('de-DE')}`;
    } else if (ev.sport === 'boxing' && ev.original) {
      const b = ev.original as BoxingScheduleItem;
      question = `Wer gewinnt den Boxkampf: ${b.details}?`;
      const fighters = b.details?.split(' vs ');
      opts =
        fighters?.length === 2
          ? [
              `${fighters[0].trim()} gewinnt`,
              `${fighters[1].trim()} gewinnt`,
              'Unentschieden',
            ]
          : ['Boxer 1 gewinnt', 'Boxer 2 gewinnt', 'Unentschieden'];
      desc = `Boxen: ${b.details}\nOrt: ${b.location}`;
    } else if (ev.sport === 'football' && ev.original) {
      const f = ev.original as FootballEvent;
      question = `Wie endet ${f.homeTeam} vs ${f.awayTeam}?`;
      opts = [
        `${f.homeTeam} gewinnt`,
        `${f.awayTeam} gewinnt`,
        'Unentschieden',
      ];
      desc = `Fußballspiel: ${title}\nWettbewerb: ${f.competition}`;
    } else {
      opts = ['Option 1', 'Option 2'];
    }

    form.reset({
      title: title.slice(0, 250),
      question: question.slice(0, 250),
      description: desc.slice(0, 500),
      options: opts.join('\n'),
      tippingDeadline: getDefaultDeadlineString(ev.date),
    });
    triggerTextareaResize();
    toast.success('Vorschlag übernommen');
  };

  /* ---------- UI ---------- */

  const triggerDefault = (
    <Button size='sm' variant='outline' className='whitespace-nowrap'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette vorschlagen
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps} variant={triggerProps.variant || 'default'}>
            {triggerProps.children}
          </Button>
        ) : (
          triggerDefault
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Trage die Details ein oder übernimm einen Vorschlag.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-grow overflow-y-auto px-1 pr-3'>
          <div className='px-6 py-4'>
            <Form {...form}>
              <form
                id='add-event-form'
                className='space-y-6'
                onSubmit={form.handleSubmit(onSubmit)}
              >
                {/* Titel */}
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

                {/* Beschreibung */}
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
                  {/* Frage */}
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

                  {/* Optionen */}
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

                {/* Deadline */}
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
              </form>
            </Form>

            {/* Vorschläge & AI */}
            <div className='mt-8 pt-6 border-t'>
              <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                <Sparkles className='w-5 h-5 text-purple-500' /> Vorschläge & AI
              </h3>

              {isLoadingCombinedEvents && (
                <div className='flex items-center justify-center py-4 text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' /> Lade …
                </div>
              )}

              {errors.combinedEvents && !isLoadingCombinedEvents && (
                <div className='my-4 rounded-md border bg-destructive/10 p-4 text-destructive text-sm'>
                  <div className='flex items-start gap-3'>
                    <AlertTriangle className='h-5 w-5' />
                    <div>
                      <p className='font-semibold'>
                        Fehler beim Laden der Vorschläge
                      </p>
                      <p className='text-xs mb-3'>{errors.combinedEvents}</p>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={loadCombinedEvents}
                      >
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
                    Keine Vorschläge vorhanden
                  </p>
                )}

              {suggestions.length > 0 && (
                <div className='overflow-y-auto pr-1 max-h-[300px] space-y-3'>
                  <EventList
                    events={suggestions}
                    onProposeEvent={handleSuggestionClick}
                    onCardAiCreate={handleAiGenerate}
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

        <DialogFooter className='mt-auto border-t pt-4 px-6 flex flex-col-reverse sm:flex-row gap-2'>
          <DialogClose asChild>
            <Button variant='ghost' className='w-full sm:w-auto'>
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
            {form.formState.isSubmitting ? 'Erstelle …' : 'Event erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
