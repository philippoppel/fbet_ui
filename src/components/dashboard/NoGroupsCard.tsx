// src/components/dashboard/NoGroupsCard.tsx

import Link from 'next/link';
import { toast } from 'sonner'; // Für die Info-Toast-Nachricht
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldPlus, LogIn } from 'lucide-react'; // Icons

export function NoGroupsCard() {
  return (
    <Card className='text-center py-10 px-4 border border-dashed mt-4 lg:mt-0'>
      <CardHeader>
        <CardTitle>Willkommen bei fbet!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground mb-6'>
          Du bist noch in keiner Gruppe aktiv. <br />
          Erstelle eine neue Gruppe oder tritt einer bestehenden bei.
        </p>
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button asChild className='hover:bg-primary/90'>
            <Link href='/groups/create'>
              <ShieldPlus className='w-4 h-4 mr-2' /> Gruppe erstellen
            </Link>
          </Button>
          <Button
            variant='outline'
            className='hover:bg-accent hover:text-accent-foreground'
            onClick={() =>
              toast.info(
                'Gruppenbeitritt erfolgt über Einladungslinks, die von Gruppenadministratoren geteilt werden.'
              )
            }
          >
            <LogIn className='w-4 h-4 mr-2' /> Gruppe beitreten (Info)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
