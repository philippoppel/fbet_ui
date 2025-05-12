// src/components/dashboard/AddEventDialog.tsx
'use client';

import React, { useState } from 'react'; // useEffect, useCallback entfernt, da nicht mehr direkt genutzt (war für interne Vorschläge)
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
// import { Input } from '@/app/components/ui/input'; // Input wird nicht mehr für Titel verwendet
import TextareaAutosize from 'react-textarea-autosize'; // Wird jetzt für Titel, Beschreibung und Optionen verwendet
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';

// Die Funktion extractAIFields bleibt unverändert
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
    question: question || title, // Fallback für Frage bleibt
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
      // ... (Logik für AI-Anfrage bleibt unverändert) ...
      const res = await fetch('/api/generate-ai-bet', {
        /* ... */
      });
      if (!res.ok) {
        /* ... Fehlerbehandlung ... */ throw new Error(/* ... */);
      }
      const data = await res.json();
      const suggestion = extractAIFields(data.message || '');
      if (!suggestion.title && !suggestion.question) {
        /* ... Fehler ... */ return;
      }
      // Formular zurücksetzen
      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '',
        description: suggestion.description || '',
        options: suggestion.options || '',
      });
      // Trigger re-validation oder focus, wenn nötig, damit Autosize greift
      // Oft reicht form.reset, aber manchmal braucht es einen kleinen Schubs
      setTimeout(() => {
        // Simuliert ein Input-Event auf allen Textareas, um Autosize sicher zu triggern
        document
          .querySelectorAll('textarea[data-react-textarea-autosize]')
          .forEach((el) => {
            const event = new Event('input', { bubbles: true });
            el.dispatchEvent(event);
          });
      }, 0);
      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      // ... (Fehlerbehandlung bleibt unverändert) ...
      toast.error('Fehler bei der AI-Wette.', {
        /* ... */
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

  // *** HELFER: Basisklassen für Textarea (anzupassen an dein shadcn/ui Theme) ***
  const textareaBaseClasses =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none'; // resize-none hinzugefügt, da Autosize die Größe steuert

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

        {/* Scrollbarer Inhaltsbereich mit konsistentem Padding */}
        <div className='flex-grow overflow-y-auto px-6 pt-2 pb-4'>
          <Form {...form}>
            <form id='add-event-form' className='space-y-4'>
              {/* *** GEÄNDERT: Titel verwendet jetzt TextareaAutosize *** */}
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <TextareaAutosize
                        placeholder='Wie oft klingelt der Postbote?'
                        minRows={1} // Startet einzeilig
                        maxRows={3} // Erlaubt Umbruch auf bis zu 3 Zeilen
                        className={textareaBaseClasses} // Styling
                        {...field}
                        // Optional: Verhalten der Enter-Taste anpassen (siehe vorherige Antwort)
                        // onKeyDown={(e) => { ... }}
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
                        minRows={2} // Mindesthöhe
                        className={textareaBaseClasses}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='grid md:grid-cols-2 gap-4'>
                {/* Frage bleibt ein Input-Feld (meist kürzer) */}
                <FormField
                  control={form.control}
                  name='question'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frage</FormLabel>
                      <FormControl>
                        {/* Annahme: Frage ist meist kürzer, Standard-Input okay */}
                        {/* Falls Fragen auch lang werden, hier ebenfalls Autosize erwägen */}
                        <TextareaAutosize
                          placeholder='Wer gewinnt?'
                          minRows={1}
                          maxRows={3} // Beispiel
                          className={textareaBaseClasses} // Konsistentes Styling
                          {...field}
                          // Optional: onKeyDown für Enter-Verhalten
                        />
                        {/* Oder ursprüngliches Input:
                        <Input placeholder='Wer gewinnt?' {...field} />
                        */}
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
                          minRows={3} // Mindesthöhe
                          className={`${textareaBaseClasses} whitespace-pre-wrap`} // Wichtig für Zeilenumbrüche in Optionen
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

        {/* Responsiver Dialog Footer */}
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
            className='w-full sm:w-auto'
            onClick={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
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
            className='w-full sm:w-auto'
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
