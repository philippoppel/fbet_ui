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
import { EventList } from '@/components/dashboard/EventList'; // Annahme: Diese Komponente existiert
import { toast } from 'sonner';
import type { UseFormReturn } from 'react-hook-form';
import type { MixedEvent, UfcEventItem, BoxingScheduleItem } from '@/lib/types'; // Annahme: Diese Typen existieren
import type { AddEventFormData } from '@/hooks/useGroupInteractions'; // Annahme: Dieser Typ existiert
import React from 'react'; // React importieren

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
  triggerProps, // Trigger Props werden hier jetzt empfangen
}: AddEventDialogProps) {
  /* ---- Vorschlag übernehmen & Formular füllen ---- */
  const handleSuggestionClick = (ext: UfcEventItem | BoxingScheduleItem) => {
    let title = 'Event Titel';
    let options = ['Option A', 'Option B', 'Unentschieden'];
    const question = 'Wer gewinnt?';
    options = ['1', '2', 'X']; // Standard für Kampfsport

    // Versucht, Titel und Kämpfer aus den Details oder der Zusammenfassung zu extrahieren
    if ('details' in ext && ext.details) {
      title = ext.details;
      // Optional: Kämpfer extrahieren, falls benötigt
      // const fighters = ext.details.split(/ vs\. /i);
    } else if ('summary' in ext && ext.summary) {
      title = ext.summary;
      // Optional: Kämpfer extrahieren, falls benötigt
      // const fighters = ext.summary.split(/ vs\. /i);
    }

    // Formular mit den extrahierten oder Standardwerten zurücksetzen
    form.reset(
      {
        title: title.slice(0, 250), // Titel auf max. 250 Zeichen kürzen
        question,
        options: options.join('\n'), // Optionen als mehrzeiligen String
        description: `Externes Event: ${title}`.slice(0, 500), // Beschreibung auf max. 500 Zeichen kürzen
      },
      { keepErrors: true, keepDirty: true, keepTouched: true } // Formularstatus beibehalten
    );

    // Erfolgsmeldung anzeigen
    toast.success('Vorschlag übernommen', {
      description: `"${title}" wurde ins Formular eingetragen.`,
    });
  };

  // Standard-Trigger, falls keine triggerProps übergeben werden
  const defaultTrigger = (
    <Button size='sm' variant='default' className='hover:bg-primary/90'>
      <PlusCircle className='mr-2 h-4 w-4' />
      Neues Event
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Verwendet entweder die übergebenen Trigger Props oder den Standard Button */}
      <DialogTrigger asChild>
        {triggerProps ? (
          <Button {...triggerProps}>
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

      {/* ---------- Dialog Inhalt (mit Scroll-Fix) ---------- */}
      {/*
        ÄNDERUNG:
        - max-h-[90vh] begrenzt die Höhe auf 90% der Viewport-Höhe.
        - overflow-y-auto fügt eine vertikale Scrollleiste hinzu, WENN der Inhalt höher ist.
        - display-flex und flex-col sorgen dafür, dass der Inhalt korrekt im scrollbaren Bereich angeordnet wird.
      */}
      <DialogContent className='sm:max-w-[640px] max-h-[90vh] flex flex-col'>
        {/* ---------- Header (bleibt oben fixiert) ---------- */}
        <DialogHeader className='flex-shrink-0'>
          <DialogTitle>Neues Event für „{groupName}“</DialogTitle>
          <DialogDescription>
            Manuell anlegen oder Vorschlag übernehmen.
          </DialogDescription>
        </DialogHeader>
        {/* ---------- Scrollbarer Hauptbereich ---------- */}
        {/*
          ÄNDERUNG:
          - Dieser div umschließt den scrollbaren Teil (Formular + Vorschläge).
          - overflow-y-auto macht diesen Bereich scrollbar.
          - pr-6 (padding-right) gibt etwas Platz für die Scrollleiste, um Überlappung zu vermeiden.
            (Kann je nach Styling angepasst werden)
        */}
        <div className='flex-grow overflow-y-auto pr-6 -mr-6 pl-6 -ml-6'>
          {/* ---------- Formular ---------- */}
          <Form {...form}>
            {/* WICHTIG: onSubmit hier entfernen, da es jetzt am äußeren Button hängt */}
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

              {/* Grid für Frage und Optionen */}
              <div className='grid md:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='question'
                  render={({ field }) => (
                    <FormItem>
                      {' '}
                      {/* h-full entfernt, da Textarea Höhe bestimmt */}
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
                      {' '}
                      {/* h-full entfernt */}
                      <FormLabel>Optionen</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Option 1\nOption 2\n...`}
                          rows={3} // Feste Zeilenanzahl für Konsistenz
                          className='whitespace-pre-wrap' // Zeilenumbrüche beibehalten
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

          {/* ---------- Vorschlags-Liste ---------- */}
          <div className='mt-6 pt-6 border-t'>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Sparkles className='w-5 h-5 text-muted-foreground' />
              Vorschläge übernehmen
            </h3>
            {/* max-h-[300px] hier entfernt, da der äußere Container scrollt */}
            <div className='overflow-y-auto pr-3'>
              <EventList
                events={suggestions}
                onProposeEvent={handleSuggestionClick}
                disabled={false} // Annahme: Vorschläge sind immer aktiv
              />
            </div>
          </div>
        </div>{' '}
        {/* Ende des scrollbaren Bereichs */}
        {/* ---------- Footer (bleibt unten fixiert) ---------- */}
        {/*
          ÄNDERUNG:
          - pt-4 hinzugefügt für etwas Abstand zum scrollbaren Bereich.
          - border-t entfernt, da der Vorschlagsbereich schon eine hat.
          - `form='add-event-form'` auf dem Submit-Button, um das Formular auszulösen.
        */}
        <DialogFooter className='sm:justify-end pt-4 flex-shrink-0'>
          <DialogClose asChild>
            <Button type='button' variant='ghost'>
              Abbrechen
            </Button>
          </DialogClose>
          {/* Button löst das Submit-Event des Formulars über die ID aus */}
          <Button
            type='submit'
            form='add-event-form' // Verknüpft Button mit Formular via ID
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)} // onSubmit hier aufrufen
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
