// src/components/dashboard/HighscorePlaceholder.tsx

import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react'; // Optional: Passendes Icon

export function HighscorePlaceholder() {
  return (
    <Card className='flex flex-col items-center justify-center h-48 text-center shadow-sm border border-dashed'>
      {/* Optional: Icon hinzufügen */}
      {/* <Trophy className="w-8 h-8 text-muted-foreground mb-3" /> */}
      <p className='text-sm text-muted-foreground px-4'>
        Wähle links eine Gruppe aus, <br /> um die Rangliste zu sehen.
      </p>
    </Card>
  );
}
