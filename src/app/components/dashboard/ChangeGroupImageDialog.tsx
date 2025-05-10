'use client';

import { useState, startTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr'; // SWR-Cache invalidieren

type Props = {
  groupId: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  onImageChanged: (url: string | null) => void; // ➊ NEU
};

export function ChangeGroupImageDialog({
  groupId,
  open,
  setOpen,
  onImageChanged, // ➋
}: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!file) return;

    setBusy(true);
    try {
      /* ---------- Upload ---------- */
      const fd = new FormData();
      fd.append('file', file);
      const { url } = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      }).then((r) => r.json());

      /* ---------- PATCH ---------- */
      await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      /* ---------- Client-Refresh ---------- */
      onImageChanged(url); // ➌ Optimistisches Update
      mutate(`/api/groups/${groupId}`); // ➍ SWR-Cache aktualisieren

      // App-Router: Server Components revalidieren
      startTransition(() => router.refresh()); // ➎ kein UI-Block

      toast.success('Gruppenbild aktualisiert');
      setOpen(false);
    } catch (err) {
      toast.error('Aktualisierung fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gruppenbild ändern</DialogTitle>
        </DialogHeader>

        <Input
          type='file'
          accept='image/*'
          onChange={(e) => setFile(e.target.files?.[0])}
        />

        <div className='flex justify-end gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!file || busy}>
            {busy ? 'Lade…' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
