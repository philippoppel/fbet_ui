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
import { mutate } from 'swr';
import { useAuth } from '@/app/context/AuthContext'; // 🔐 Auth-Kontext

type Props = {
  groupId: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  onImageChanged: (url: string | null) => void;
};

export function ChangeGroupImageDialog({
  groupId,
  open,
  setOpen,
  onImageChanged,
}: Props) {
  const router = useRouter();
  const auth = useAuth(); // 🔐 Token holen
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!file) return;

    if (!auth.token) {
      toast.error('Nicht eingeloggt', {
        description: 'Du musst eingeloggt sein, um das Bild zu ändern.',
      });
      return;
    }

    setBusy(true);
    try {
      // ---------- Upload ----------
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      const { url, error } = await uploadRes.json();
      if (!uploadRes.ok || !url)
        throw new Error(error || 'Upload fehlgeschlagen');

      // ---------- PATCH ----------
      const patchRes = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`, // 🔐 Auth-Header
        },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!patchRes.ok) {
        const errJson = await patchRes.json();
        throw new Error(errJson?.error || 'Update fehlgeschlagen');
      }

      // ---------- Client-Refresh ----------
      onImageChanged(url);
      mutate(`/api/groups/${groupId}`);
      startTransition(() => router.refresh());
      toast.success('Gruppenbild aktualisiert');
      setOpen(false);
    } catch (err) {
      toast.error('Aktualisierung fehlgeschlagen', {
        description: err instanceof Error ? err.message : String(err),
      });
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
