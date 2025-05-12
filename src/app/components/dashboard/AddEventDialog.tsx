// src/components/dashboard/AddEventDialog.tsx
'use client';

import React, { useState } from 'react';
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
// NEU: Input wird jetzt für die Deadline verwendet
import { Input } from '@/app/components/ui/input';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
// Stelle sicher, dass AddEventFormData aus dem Hook tippingDeadline: string enthält
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';

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
  // ... (Parsing-Logik bleibt unverändert) ...
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
        parsingState = 'none'; // Stoppe Options-Parsing, wenn unklar
        // Verarbeite die aktuelle Zeile erneut im 'none'-Status (optional)
        // Hier gehen wir davon aus, dass die Zeile nicht mehr zu Optionen gehört
      }
    } else if (parsingState === 'description') {
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) => lowerLine.includes(kw))
      ) {
        description += '\n' + line;
      } else {
        parsingState = 'none'; // Stoppe Beschreibungs-Parsing
        // Verarbeite die aktuelle Zeile erneut im 'none'-Status (optional)
      }
    }
  }
  description = description.trim();
  return {
    title: title,
    question: question || title,
    description: description,
    options: options.join('\n'),
    // Wichtig: Die AI gibt keine Deadline vor, diese wird separat gehandhabt
  };
};

// NEU: Hilfsfunktion für Standard-Deadline (kann auch importiert werden)
/**
 * Gibt das Datum "heute + 1 Monat" als String im Format YYYY-MM-DDTHH:MM zurück,
 * passend für den value eines <input type="datetime-local">.
 */
const getDefaultDeadlineString = (): string => {
  const dateInOneMonth = new Date();
  dateInOneMonth.setMonth(dateInOneMonth.getMonth() + 1);
  // Korrektur für Zeitzone, damit die *lokale* Zeit im Input landet
  const offset = dateInOneMonth.getTimezoneOffset(); // Minuten-Unterschied zu UTC
  const localDate = new Date(dateInOneMonth.getTime() - offset * 60000); // Korrigierte Zeit
  // Formatieren als YYYY-MM-DDTHH:MM
  return localDate.toISOString().slice(0, 16);
};

// --- PROPS ---
type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>; // Muss tippingDeadline: string enthalten
  onSubmit: (values: AddEventFormData) => void; // Wird ans Formular übergeben
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

// --- KOMPONENTE ---
export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  onSubmit, // Wird jetzt an <form> übergeben
  triggerProps,
}: AddEventDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Funktion generateAiSuggestion - angepasst für Deadline Reset
  const generateAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/generate-ai-bet', {
        /* ... */
      });
      if (!res.ok) {
        /* ... Fehler ... */ throw new Error(/* ... */);
      }
      const data = await res.json();
      const suggestion = extractAIFields(data.message || '');
      if (!suggestion.title && !suggestion.question) {
        /* ... Fehler ... */ return;
      }

      // Formular mit AI-Werten UND Standard-Deadline zurücksetzen
      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '',
        description: suggestion.description || '',
        options: suggestion.options || '',
        // NEU: Setze die Deadline auf den Standardwert zurück
        tippingDeadline: getDefaultDeadlineString(),
      });

      // Trigger Autosize...
      setTimeout(() => {
        document
          .querySelectorAll(
            'textarea[data-react-textarea-autosize="true"], input[type="datetime-local"]'
          ) // Auch datetime input berücksichtigen? (Normalerweise nicht nötig)
          .forEach((el) => {
            const event = new Event('input', { bubbles: true });
            try {
              el.dispatchEvent(event);
            } catch (e) {
              /* ... */
            }
          });
      }, 0);
      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler bei AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        /* ... */
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Der Default-Trigger-Button - vollständig
  const defaultTrigger = (
    <Button size='sm' variant='ghost' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette
    </Button>
  );

  // Basisklassen für Textarea - vollständig (ggf. an dein Theme anpassen)
  const textareaBaseClasses =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none';

  return (
    // NEU: onOpenChange zum Zurücksetzen beim Schließen hinzugefügt
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        // Beim Schließen des Dialogs das Formular auf Defaults zurücksetzen
        if (!isOpen) {
          form.reset({
            // Explizite Defaults oder einfach form.reset(), wenn useForm Defaults korrekt sind
            title: '',
            description: '',
            question: 'Wer gewinnt?',
            options: '',
            tippingDeadline: getDefaultDeadlineString(), // Wichtig: Deadline auch zurücksetzen
          });
        }
      }}
    >
      <DialogTrigger asChild>
        {/* Trigger-Button wie vorher */}
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

      {/* Dialog-Inhalt */}
      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        {/* Dialog-Header */}
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Fülle die Felder manuell aus oder generiere einen AI-Vorschlag. Die
            Tipp-Deadline ist erforderlich.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollbarer Hauptbereich */}
        <div className='flex-grow overflow-y-auto px-6 pt-2 pb-4'>
          {/* NEU: onSubmit wird hier übergeben */}
          <Form {...form}>
            <form
              id='add-event-form'
              className='space-y-4'
              onSubmit={form.handleSubmit(onSubmit)} // React-Hook-Form's Submit-Handler
            >
              {/* Titel-Feld */}
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <TextareaAutosize
                        placeholder='Wie oft klingelt der Postbote?'
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
              {/* Beschreibungs-Feld */}
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
                        className={textareaBaseClasses}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Grid für Frage und Optionen */}
              <div className='grid md:grid-cols-2 gap-4'>
                {/* Frage-Feld */}
                <FormField
                  control={form.control}
                  name='question'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frage</FormLabel>
                      <FormControl>
                        <TextareaAutosize
                          placeholder='Wer gewinnt?'
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
                {/* Optionen-Feld */}
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

              {/* --- NEUES FELD: TIPPING DEADLINE --- */}
              <FormField
                control={form.control}
                name='tippingDeadline' // Name muss mit Schema übereinstimmen
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipp-Deadline</FormLabel>
                    <FormControl>
                      <Input
                        type='datetime-local'
                        className='block w-full border-input' // Ggf. Styling anpassen
                        {...field} // Verbindet value, onChange, onBlur etc.
                      />
                    </FormControl>
                    <FormDescription>
                      Bis wann dürfen Tipps abgegeben werden? (Standard: +1
                      Monat)
                    </FormDescription>
                    <FormMessage /> {/* Zeigt Validierungsfehler an */}
                  </FormItem>
                )}
              />
              {/* --- ENDE NEUES FELD --- */}
            </form>
          </Form>
        </div>

        {/* Dialog-Footer (Responsiv) */}
        <DialogFooter className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t mt-auto'>
          {/* Abbrechen-Button */}
          <DialogClose asChild>
            <Button type='button' variant='ghost' className='w-full sm:w-auto'>
              Abbrechen
            </Button>
          </DialogClose>
          {/* Event erstellen-Button (Submit) - Vereinfacht */}
          <Button
            type='submit' // Löst das onSubmit des <form>-Elements aus
            form='add-event-form' // Verknüpft mit dem Formular via ID
            disabled={form.formState.isSubmitting || isAiLoading}
            className='w-full sm:w-auto'
            // onClick wird nicht mehr benötigt
          >
            {form.formState.isSubmitting ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : null}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
          {/* AI Vorschlag-Button */}
          <Button
            variant='outline'
            onClick={generateAiSuggestion} // Ruft die angepasste Funktion auf
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
