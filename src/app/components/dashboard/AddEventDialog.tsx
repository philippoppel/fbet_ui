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
import { Textarea } from '@/app/components/ui/textarea';
import { Button, type ButtonProps } from '@/app/components/ui/button';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { AddEventFormData } from '@/app/hooks/useGroupInteractions';
// Imports für interne Vorschläge (UFC/Boxing) wurden entfernt,
// da sie in der Version mit AI nicht mehr verwendet wurden.
// Füge sie wieder hinzu, falls du beides kombinieren möchtest.
// import { EventList } from '@/app/components/dashboard/EventList';
// import type { MixedEvent, UfcEventItem, BoxingScheduleItem } from '@/app/lib/types';
// import { getUfcSchedule, getBoxingSchedule } from '@/app/lib/api';

/**
 * Extrahiert Felder aus einer AI-Antwort.
 * Angepasst, um mit Formaten wie "**1. Titel:** ..." und Optionen mit Markern umzugehen.
 */
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

    // Suche nach Keywords, ignoriere Präfixe wie "**1. "
    if (lowerLine.includes('titel:')) {
      title = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.includes('frage:')) {
      question = line.split(':')[1]?.trim().replace(/^"|"$/g, '') || '';
      parsingState = 'none';
    } else if (lowerLine.includes('optionen:')) {
      parsingState = 'options';
    } else if (lowerLine.includes('beschreibung:')) {
      // Nimm alles nach dem ersten Doppelpunkt als Anfang der Beschreibung
      description = line.split(':').slice(1).join(':').trim();
      parsingState = 'description';
    } else if (parsingState === 'options') {
      // Erkenne übliche Optionsmarker (*, -, 1., A)) oder nimm die Zeile direkt, wenn kein neuer Abschnitt beginnt
      if (line.match(/^(\*|\-|\d+\.|[A-Z]\))\s+/)) {
        // Entferne den Marker
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
        // Wahrscheinlich ein neuer Abschnitt oder irrelevante Zeile, beende Options-Parsing
        parsingState = 'none';
        // Optional: Verarbeite die Zeile erneut, falls sie zu einem anderen Abschnitt gehört
      }
    } else if (parsingState === 'description') {
      // Füge Zeilen zur Beschreibung hinzu, bis ein neues Keyword kommt
      if (
        !['titel:', 'frage:', 'optionen:'].some((kw) => lowerLine.includes(kw))
      ) {
        description += '\n' + line;
      } else {
        // Stoppe das Sammeln der Beschreibung, wenn ein neues Keyword erkannt wird
        parsingState = 'none';
        // Optional: Verarbeite die Zeile erneut
      }
    }
  }

  // Bereinige die Beschreibung am Ende
  description = description.trim();

  return {
    title: title,
    // Verwende extrahierte Frage, falle auf Titel zurück, wenn keine extrahiert wurde
    question: question || title,
    description: description,
    options: options.join('\n'), // Füge die gesammelten Optionen mit Zeilenumbruch zusammen
  };
};

type AddEventDialogProps = {
  groupName: string;
  open: boolean;
  // *** GEÄNDERT: Prop-Namen korrigiert ***
  setOpen: (val: boolean) => void;
  form: UseFormReturn<AddEventFormData>;
  onSubmit: (values: AddEventFormData) => void;
  // *** ENDE ÄNDERUNG ***
  triggerProps?: ButtonProps & { children?: React.ReactNode };
};

export function AddEventDialog({
  groupName,
  open,
  setOpen, // Korrigierter Name
  form,
  onSubmit, // Korrigierter Name
  triggerProps,
}: AddEventDialogProps) {
  // State für interne Vorschläge (UFC/Boxing) ist hier auskommentiert,
  // da er in der AI-Version nicht aktiv genutzt wurde. Bei Bedarf reaktivieren.
  // const [internalSuggestions, setInternalSuggestions] = useState<MixedEvent[]>([]);
  // const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  // const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // const loadSuggestions = useCallback(async () => { /* ... Logik ... */ }, []);
  // useEffect(() => { /* ... Logik zum Laden der Vorschläge ... */ }, [open, ...]);

  const [isAiLoading, setIsAiLoading] = useState(false); // State für AI Ladeanzeige

  const generateAiSuggestion = async () => {
    setIsAiLoading(true); // Ladeanzeige starten
    try {
      const res = await fetch('/api/generate-ai-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `lustige Wette für Gruppe "${groupName}"`,
        }), // Kontext optional anpassen
      });

      if (!res.ok) {
        let errorMsg = `API-Fehler: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          /* Ignorieren, wenn Antwort kein JSON ist */
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      console.log('AI Response Message:', data.message);

      const suggestion = extractAIFields(data.message || '');
      console.log('Extracted Suggestion:', suggestion);

      if (!suggestion.title && !suggestion.question) {
        // Prüfe ob Titel ODER Frage extrahiert wurde
        toast.error('AI konnte keine gültige Wette erzeugen.', {
          description: 'Das Format der AI-Antwort war unerwartet.',
        });
        console.log(
          'AI response did not contain title/question or extraction failed.'
        );
        return; // Beende hier, wenn nichts Sinnvolles extrahiert wurde
      }

      // Formular zurücksetzen mit den extrahierten Werten
      // Stelle sicher, dass alle Felder in AddEventFormData existieren
      form.reset({
        title: suggestion.title || '',
        question: suggestion.question || suggestion.title || '', // Fallback auf Titel
        description: suggestion.description || '',
        options: suggestion.options || '',
        // Setze andere Felder ggf. auf Standardwerte zurück, falls nötig
      });

      toast.success('AI-Vorschlag eingefügt!');
    } catch (error: any) {
      console.error('Fehler beim Generieren/Anwenden der AI-Wette:', error);
      toast.error('Fehler bei der AI-Wette.', {
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAiLoading(false); // Ladeanzeige beenden
    }
  };

  // Standard Trigger Button, falls keine triggerProps übergeben werden
  const defaultTrigger = (
    <Button size='sm' variant='ghost' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' /> Neue Wette
    </Button>
  );

  return (
    // *** GEÄNDERT: onOpenChange verwendet jetzt 'setOpen' ***
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
          defaultTrigger // Verwende den Standardbutton, falls keine triggerProps
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Fülle die Felder manuell aus oder generiere einen AI-Vorschlag.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollbarer Inhaltsbereich */}
        <div className='flex-grow overflow-y-auto px-1 py-1 -mx-6 pl-6 pr-4'>
          {' '}
          {/* Padding angepasst für Scrollbar */}
          <Form {...form}>
            {/* Das Formular-Tag benötigt keine onSubmit-Prop hier,
                da der Submit-Button form.handleSubmit verwendet */}
            <form id='add-event-form' className='space-y-4 pt-4 pr-2'>
              {' '}
              {/* Kleines Padding rechts */}
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
                      <Textarea
                        placeholder='Genauere Definition, Regeln etc.'
                        rows={2}
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
                        <Textarea
                          placeholder={'Option 1\nOption 2\n...'}
                          rows={3}
                          className='whitespace-pre-wrap' // Wichtig für Zeilenumbrüche
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
          {/* Optional: Bereich für interne Vorschläge (UFC/Boxing) hier wieder einfügen,
              wenn diese Funktionalität benötigt wird. */}
          {/* <div className='mt-6 pt-6 border-t'> ... Code für interne Vorschläge ... </div> */}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className='sm:justify-end pt-4 border-t mt-auto'>
          {' '}
          {/* border-t hinzugefügt */}
          <DialogClose asChild>
            <Button type='button' variant='ghost'>
              {' '}
              {/* Geändert zu ghost für Konsistenz */}
              Abbrechen
            </Button>
          </DialogClose>
          {/* *** GEÄNDERT: onClick verwendet jetzt 'onSubmit' *** */}
          <Button
            type='submit' // type='submit' ist korrekt, wenn es auf das form-Attribut verweist
            form='add-event-form' // Verknüpft den Button mit dem Formular
            disabled={form.formState.isSubmitting || isAiLoading} // Deaktivieren während Submit ODER AI-Laden
            // onClick wird von form.handleSubmit bereitgestellt, wenn type='submit' und form='...' gesetzt sind
            // Alternative: onClick={form.handleSubmit(onSubmit)} wenn type='button' wäre
            onClick={(e) => {
              // Manuelles Triggern von handleSubmit, falls type="submit" nicht zuverlässig funktioniert
              // Normalerweise unnötig bei Verknüpfung über form="id"
              e.preventDefault(); // Verhindert Standard-Form-Submit, falls doch ausgelöst
              form.handleSubmit(onSubmit)(); // handleSubmit aufrufen
            }}
          >
            {form.formState.isSubmitting && (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            )}
            {form.formState.isSubmitting ? 'Erstelle…' : 'Event erstellen'}
          </Button>
          <Button
            variant='outline'
            onClick={generateAiSuggestion}
            disabled={isAiLoading || form.formState.isSubmitting} // Deaktivieren während AI-Laden oder Submit
          >
            {isAiLoading ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Sparkles className='h-4 w-4 mr-2' /> // Sparkles statt Roboter
            )}
            {isAiLoading ? 'Generiere...' : 'AI Vorschlag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
