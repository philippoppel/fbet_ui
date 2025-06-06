'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { XIcon } from 'lucide-react';
import type { Event as GroupEvent } from '@/app/lib/types';

interface DeleteEventDialogProps {
  event: GroupEvent | null;
  onClose: () => void;
  onConfirm: (eventId: number) => Promise<void> | void;
}

export default function DeleteEventDialog({
  event,
  onClose,
  onConfirm,
}: DeleteEventDialogProps) {
  const open = !!event;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:pointer-events-none'
          )}
        />

        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm',
            'translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:pointer-events-none'
          )}
        >
          {/* Schließen-Icon */}
          <Dialog.Close
            className='absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            aria-label='Close'
          >
            <XIcon className='h-4 w-4' />
          </Dialog.Close>

          <Dialog.Title className='mb-2 text-lg font-semibold'>
            Event wirklich löschen?
          </Dialog.Title>

          <Dialog.Description className='mb-6 text-sm text-muted-foreground break-words'>
            „{event?.title ?? 'Unbenanntes Event'}“
          </Dialog.Description>

          <div className='flex justify-end gap-2'>
            {/* ------------- Abbrechen ------------- */}
            <Dialog.Close asChild>
              <Button variant='secondary'>Abbrechen</Button>
            </Dialog.Close>

            {/* ------------- Löschen ------------- */}
            <Button
              variant='destructive'
              onClick={async () => {
                if (!event) return;
                await onConfirm(event.id);
                // Nach dem Confirm bleibt open==true bis onClose() getriggert wird
              }}
            >
              Löschen
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
