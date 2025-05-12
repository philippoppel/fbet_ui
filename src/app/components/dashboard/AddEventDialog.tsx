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
// import { Input } from '@/app/components/ui/input'; // Input wird nicht mehr direkt verwendet
import TextareaAutosize from 'react-textarea-autosize'; // Wird für Titel, Frage, Beschreibung und Optionen verwendet
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';

// Die Funktion extractAIFields - vollständig
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
      // Erkenne übliche Optionsmarker (*, -, 1., A)) oder nimm die Zeile direkt
      if (line.match(/^(\*|\-|\d+\.|[A-Z]\))\s+/)) {
        options.push(line.replace(/^(\*|\-|\d+\.|[A-Z]\))\s*/, '').trim());
      } else if (
        line.length > 0 &&
        !line.includes(':') &&
        !['titel:', 'frage:', 'beschreibung:'].some((kw) =>
          lowerLine.includes(kw)
        )
      ) {
        // Fallback: Zeile gehört zu Optionen, wenn kein neues Keyword auftaucht
        options.push(line.trim());
      } else {
        // Wahrscheinlich ein neuer Abschnitt, beende Options-Parsing
        parsingState = 'none';
      }
    } else if (parsingState === 'description') {
      // Füge Zeilen zur Beschreibung hinzu, bis ein neues Keyword kommt
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) => lowerLine.includes(kw))
      ) {
        description += '\n' + line;
      } else {
        // Stoppe das Sammeln der Beschreibung
        parsingState = 'none';
      }
    }
  }
  description = description.trim(); // Endgültige Bereinigung
  return {
    title: title,
    question: question || title, // Fallback auf Titel, wenn keine Frage extrahiert wurde
    description: description,
    options: options.join('\n'), // Optionen als einzelnen String mit Zeilenumbrüchen
  };
};

// Der Typ AddEventDialogProps - vollständig
type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

// Die Komponente AddEventDialog - vollständig
export function AddEventDialog({
  groupName,
  open,
  setOpen,
  form,
  onSubmit,
  triggerProps,
}: AddEventDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Die Funktion generateAiSuggestion - vollständig
  const generateAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      // Fetch-Aufruf zur API
      const res = await fetch('/api/generate-ai-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `lustige Wette für Gruppe "${groupName}"`, // Kontext senden
        }),
      });

      // Fehlerbehandlung für die API-Antwort
      if (!res.ok) {
        let errorMsg = `API-Fehler: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg; // Versuche, spezifischere Fehlermeldung aus JSON zu lesen
        } catch {
          // Ignorieren, wenn die Fehlerantwort kein JSON ist
        }
        throw new Error(errorMsg); // Fehler werfen, wird im catch-Block behandelt
      }

      // Erfolgreiche Antwort verarbeiten
      const data = await res.json();
      console.log('AI Response Message:', data.message); // Loggen der rohen AI-Antwort

      const suggestion = extractAIFields(data.message || ''); // Felder extrahieren
      console.log('Extracted Suggestion:', suggestion); // Loggen der extrahierten Felder

      // Prüfen, ob mindestens Titel oder Frage extrahiert wurde
      if (!suggestion.title && !suggestion.question) {
        toast.error('AI konnte keine gültige Wette erzeugen.', {
          description: 'Das Format der AI-Antwort war unerwartet.',
        });
        console.log(
          'AI response did not contain title/question or extraction failed.'
        );
        return; // Frühzeitig beenden, wenn nichts Sinnvolles extrahiert wurde
      }

      // Formular mit den extrahierten Werten zurücksetzen
      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '', // Fallback verwenden
        description: suggestion.description || '',
        options: suggestion.options || '',
        // Stelle sicher, dass alle Felder von AddEventFormData hier abgedeckt sind,
        // ggf. mit Standardwerten für nicht von der AI gelieferte Felder.
      });

      // Trigger Autosize-Neuberechnung nach dem Reset (wichtig!)
      setTimeout(() => {
        document
          .querySelectorAll('textarea[data-react-textarea-autosize="true"]') // Selektor ggf. anpassen
          .forEach((el) => {
            const event = new Event('input', { bubbles: true });
            try {
              el.dispatchEvent(event);
            } catch (e) {
              console.error('Error dispatching event for autosize', e);
            }
          });
      }, 0);

      toast.success('AI-Vorschlag eingefügt!'); // Erfolgsmeldung
    } catch (error: any) {
      // Allgemeine Fehlerbehandlung für den try-Block
      console.error('Fehler beim Generieren/Anwenden der AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      // Wird immer ausgeführt, egal ob Erfolg oder Fehler
      setIsAiLoading(false); // Ladeanzeige beenden
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

  // Das zurückgegebene JSX - vollständig
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

      {/* Dialog-Inhalt */}
      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        {/* Dialog-Header */}
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Fülle die Felder manuell aus oder generiere einen AI-Vorschlag.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollbarer Hauptbereich */}
        <div className='flex-grow overflow-y-auto px-6 pt-2 pb-4'>
          <Form {...form}>
            <form id='add-event-form' className='space-y-4'>
              {/* Titel-Feld (TextareaAutosize) */}
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
              {/* Beschreibungs-Feld (TextareaAutosize) */}
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
                {/* Frage-Feld (TextareaAutosize) */}
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
                {/* Optionen-Feld (TextareaAutosize) */}
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
                          className={`${textareaBaseClasses} whitespace-pre-wrap`} // Zeilenumbrüche beachten
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

        {/* Dialog-Footer (Responsiv) */}
        <DialogFooter className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t mt-auto'>
          {/* Abbrechen-Button */}
          <DialogClose asChild>
            <Button type='button' variant='ghost' className='w-full sm:w-auto'>
              Abbrechen
            </Button>
          </DialogClose>
          {/* Event erstellen-Button (Submit) */}
          <Button
            type='submit'
            form='add-event-form' // Verknüpft mit dem Formular via ID
            disabled={form.formState.isSubmitting || isAiLoading}
            className='w-full sm:w-auto'
            onClick={(e) => {
              e.preventDefault(); // Verhindert Standard-Submit, falls doch ausgelöst
              form.handleSubmit(onSubmit)(); // Ruft react-hook-form's Submit-Handler auf
            }}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : null}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
          {/* AI Vorschlag-Button */}
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
