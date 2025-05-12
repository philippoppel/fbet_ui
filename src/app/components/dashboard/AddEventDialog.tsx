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
// import { Textarea } from '@/app/components/ui/textarea'; // Ersetzt durch TextareaAutosize oder deine angepasste Komponente
import TextareaAutosize from 'react-textarea-autosize'; // *** NEU: Import für automatisch anpassende Textarea ***
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';

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
          /* Ignorieren */
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
      });
      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler beim Generieren/Anwenden der AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const defaultTrigger = (
    <Button size='sm' variant='ghost' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette
    </Button>
  );

  // *** HELPER: Basisklassen für shadcn/ui Textarea, anzupassen falls nötig ***
  const textareaBaseClasses =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Fülle die Felder manuell aus oder generiere einen AI-Vorschlag.
          </DialogDescription>
        </DialogHeader>

        {/* *** GEÄNDERT: Scrollbarer Inhaltsbereich mit angepasstem Padding *** */}
        <div className='flex-grow overflow-y-auto px-6 pt-2 pb-4'>
          <Form {...form}>
            <form id='add-event-form' className='space-y-4'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Wie oft klingelt der Postbote?'
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
                      {/* *** GEÄNDERT: TextareaAutosize verwenden *** */}
                      <TextareaAutosize
                        placeholder='Genauere Definition, Regeln etc.'
                        minRows={2}
                        className={textareaBaseClasses} // Basis-Styling für Konsistenz
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
                        {/* *** GEÄNDERT: TextareaAutosize verwenden *** */}
                        <TextareaAutosize
                          placeholder={'Option 1\nOption 2\n...'}
                          minRows={3}
                          className={`${textareaBaseClasses} whitespace-pre-wrap`} // Basis-Styling & Zeilenumbrüche
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
        </div>

        {/* *** GEÄNDERT: Dialog Footer mit verbesserter responsiver Button-Anordnung *** */}
        <DialogFooter className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t mt-auto'>
          <DialogClose asChild>
            <Button type='button' variant='ghost' className='w-full sm:w-auto'>
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type='submit'
            form='add-event-form'
            disabled={form.formState.isSubmitting || isAiLoading}
            className='w-full sm:w-auto' // Volle Breite auf kleinen Screens
            onClick={(e) => {
              e.preventDefault(); // Verhindert Standard-Form-Submit
              form.handleSubmit(onSubmit)(); // Triggert react-hook-form's submit
            }}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : null}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
          <Button
            variant='outline'
            onClick={generateAiSuggestion}
            disabled={isAiLoading || form.formState.isSubmitting}
            className='w-full sm:w-auto' // Volle Breite auf kleinen Screens
          >
            {isAiLoading ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Sparkles className='h-4 w-4 mr-2' />
            )}
            {isAiLoading ? 'Generiere...' : 'AI Vorschlag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
