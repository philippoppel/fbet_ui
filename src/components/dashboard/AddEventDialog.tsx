'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { EventList } from '@/components/dashboard/EventList';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { MixedEvent, UfcEventItem, BoxingScheduleItem } from '@/lib/types';
import type { AddEventFormData } from '@/hooks/useGroupInteractions';
import React from 'react';
import { cn } from '@/lib/utils';

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  suggestions: MixedEvent[];
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  suggestions,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) {
  const handleSuggestionClick = (ext: UfcEventItem | BoxingScheduleItem) => {
    let title = 'Event Titel';
    let options = ['1', '2', 'X'];
    const question = 'Wer gewinnt?';

    if ('details' in ext && ext.details) {
      title = ext.details;
    } else if ('summary' in ext && ext.summary) {
      title = ext.summary;
    }

    form.reset(
      {
        title: title.slice(0, 250),
        question,
        options: options.join('\n'),
        description: `Externes Event: ${title}`.slice(0, 500),
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
      Neues Event
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
            <div className='overflow-y-auto pr-3'>
              <EventList
                events={suggestions}
                onProposeEvent={handleSuggestionClick}
                disabled={false}
              />
            </div>
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
            onClick={form.handleSubmit(onSubmit)}
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
