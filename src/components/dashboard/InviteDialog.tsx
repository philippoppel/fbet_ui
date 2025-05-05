// src/components/dashboard/InviteDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Share2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';

type InviteDialogProps = {
  open: boolean;
  setOpen: (isOpen: boolean) => void;
  groupName: string;
  inviteToken: string | null;
};

export function InviteDialog({
  open,
  setOpen,
  groupName,
  inviteToken,
}: InviteDialogProps) {
  const [canShareNatively, setCanShareNatively] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  useEffect(() => {
    // Dieser Effekt wird ausgeführt, wenn sich inviteToken ändert oder die Komponente zum ersten Mal geladen wird.
    if (typeof window !== 'undefined') {
      // Stellt sicher, dass der Code nur im Browser ausgeführt wird.

      // Ermittelt die Basis-URL der aktuellen Seite (z.B. "https://www.deinedomain.de")
      // window.location.origin sollte automatisch das richtige Protokoll (http/https) enthalten.
      const baseUrl = window.location.origin;
      console.log('Base URL detected:', baseUrl); // LOG: Basis-URL prüfen

      // Erstellt die vollständige Beitritts-URL, wenn ein Token vorhanden ist.
      const generatedUrl = inviteToken
        ? `${baseUrl}/join?token=${inviteToken}` // Fügt den Pfad und den Token hinzu.
        : null; // Kein Link, wenn kein Token da ist.

      console.log('Generated joinUrl in useEffect:', generatedUrl); // LOG: Generierte URL prüfen
      setJoinUrl(generatedUrl); // Speichert die URL im State.

      // Prüft, ob die native Web Share API verfügbar ist.
      setCanShareNatively(typeof navigator?.share === 'function');
    }
  }, [inviteToken]); // Führt den Effekt erneut aus, wenn sich inviteToken ändert.

  const handleCopyLink = async () => {
    console.log('handleCopyLink called.');
    console.log('Current joinUrl:', joinUrl);
    console.log('Is navigator.clipboard available?', !!navigator.clipboard);
    console.log('Is secure context?', window.isSecureContext); // Clipboard API benötigt HTTPS oder localhost

    if (!joinUrl) {
      toast.error('Kein Einladungslink zum Kopieren vorhanden.');
      return;
    }
    // Prüft, ob die Clipboard API verfügbar ist (benötigt sicheren Kontext: HTTPS oder localhost)
    if (!navigator.clipboard) {
      toast.error(
        `Link konnte nicht kopiert werden: Clipboard API nicht verfügbar. (Benötigt HTTPS/localhost)`
      );
      return;
    }

    try {
      // Versucht, die URL in die Zwischenablage zu schreiben.
      await navigator.clipboard.writeText(joinUrl);
      toast.success('Beitrittslink kopiert!');
      console.log('Copy successful');
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      // Zeigt eine spezifischere Fehlermeldung an, falls möglich.
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Link konnte nicht kopiert werden: ${errorMessage}`);
    }
  };

  const handleNativeShare = async () => {
    console.log('handleNativeShare called.');
    console.log('Sharing joinUrl:', joinUrl);
    if (!joinUrl || typeof navigator?.share !== 'function') {
      toast.error(
        `Natives Teilen nicht möglich. URL: ${!!joinUrl}, Share API verfügbar: ${typeof navigator?.share === 'function'}`
      );
      return;
    }

    // Daten für die Web Share API vorbereiten.
    const shareData = {
      title: `Einladung: Tipprunde "${groupName}"`,
      text: `Tritt meiner Tipprunde "${groupName}" bei!`,
      url: joinUrl, // Die vollständige Beitritts-URL.
    };

    try {
      // Ruft die native Teilen-Funktion des Betriebssystems/Browsers auf.
      await navigator.share(shareData);
      console.log('Native share successful');
    } catch (err) {
      // Ignoriert den AbortError (wenn der Benutzer das Teilen abbricht), zeigt andere Fehler an.
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Fehler beim nativen Teilen:', err);
        toast.error(`Fehler beim Teilen: ${err.message}`);
      } else {
        console.log('Native share aborted by user.');
      }
    }
  };

  const handleWhatsAppShare = () => {
    console.log('handleWhatsAppShare called.');
    console.log('Sharing joinUrl:', joinUrl); // LOG: Ist die URL vollständig mit https:// ?

    if (!joinUrl) {
      toast.error('Kein Link zum Teilen vorhanden.');
      return;
    }

    // **WICHTIGE PRÜFUNG:** Stellt sicher, dass die URL mit http:// oder https:// beginnt.
    // WhatsApp benötigt dies oft, um den Link klickbar zu machen.
    if (!joinUrl.startsWith('http://') && !joinUrl.startsWith('https://')) {
      console.error(
        'FEHLER: joinUrl beginnt nicht mit http:// oder https://!',
        joinUrl
      );
      // Zeigt dem Benutzer einen Fehler an, da der Link wahrscheinlich nicht funktionieren wird.
      toast.error(
        'Fehler: Der generierte Link ist unvollständig und kann nicht geteilt werden.'
      );
      return; // Bricht die Funktion ab.
    }

    // Text für die WhatsApp-Nachricht erstellen.
    const text = `Tritt meiner Tipprunde "${groupName}" bei: ${joinUrl}`;
    // Erstellt die WhatsApp-URL mit dem kodierten Text.
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    console.log('Generated WhatsApp URL:', whatsappUrl); // LOG: Diesen Link im Browser testen

    // Öffnet den WhatsApp-Link in einem neuen Tab/Fenster.
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='sm:max-w-md space-y-4'>
        <DialogHeader>
          <DialogTitle>Freunde zu &#34;{groupName}&#34; einladen</DialogTitle>
          <DialogDescription>
            Teile diesen Link, damit Freunde deiner Tipprunde beitreten können.
            Er ist für eine begrenzte Zeit gültig.
          </DialogDescription>
        </DialogHeader>

        {/* Input-Feld für den Link */}
        <div className='flex w-full items-center space-x-2'>
          <div className='grid flex-1 gap-2'>
            <Label htmlFor='link' className='sr-only'>
              Link
            </Label>
            <Input
              id='link'
              value={joinUrl ?? 'Einladungslink wird generiert...'}
              readOnly
              className='h-9 text-sm'
              aria-label='Beitrittslink'
            />
          </div>
          {/* Button zum Kopieren */}
          <Button
            type='button'
            title='Link kopieren'
            size='icon'
            className='h-9 w-9 shrink-0'
            onClick={handleCopyLink}
            disabled={!joinUrl}
            variant='outline'
          >
            <span className='sr-only'>Link kopieren</span>
            <Copy className='h-4 w-4' />
          </Button>
        </div>

        {/* Footer mit Teilen-Buttons */}
        <DialogFooter className='sm:justify-start flex flex-row flex-wrap gap-2 pt-2'>
          {/* WhatsApp Button */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleWhatsAppShare}
            disabled={!joinUrl}
            className='bg-green-50 hover:bg-green-100 text-green-700 border-green-200' // Kleines Styling für WhatsApp
          >
            <FaWhatsapp className='mr-2 h-4 w-4' /> WhatsApp
          </Button>
          {/* Nativer Teilen Button (nur wenn verfügbar) */}
          {canShareNatively && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleNativeShare}
              disabled={!joinUrl}
            >
              <Share2 className='mr-2 h-4 w-4' /> Teilen...
            </Button>
          )}
          {/* Optional: Schließen-Button hinzufügen */}
          {/*
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm">
              Schließen
            </Button>
          </DialogClose>
          */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
