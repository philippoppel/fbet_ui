'use client';

import type {
  Event as GroupEvent,
  UserOut,
  AllTipsPerEvent,
} from '@/app/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';

type SubmittedOpenEventsCardProps = {
  events: GroupEvent[];
  user: UserOut;
  groupCreatedBy: number | null | undefined;
  onInitiateDeleteEvent: (event: GroupEvent) => void;
  userSubmittedTips: Record<number, string>;
  allTipsPerEvent: AllTipsPerEvent;
};

export default function SubmittedOpenEventsCard({
  events,
  user,
  groupCreatedBy,
  onInitiateDeleteEvent,
  userSubmittedTips,
  allTipsPerEvent,
}: SubmittedOpenEventsCardProps) {
  const submittedEvents = events.filter(
    (e) => e && !e.winningOption && userSubmittedTips[e.id] !== undefined
  );

  if (submittedEvents.length === 0) {
    return null;
  }

  return (
    <Card className='bg-muted/30 border border-border rounded-xl shadow-sm'>
      <CardHeader className='flex flex-row items-center gap-2'>
        <Eye className='h-5 w-5 text-blue-500 dark:text-blue-300 flex-shrink-0' />
        <CardTitle className='text-base sm:text-lg font-semibold text-foreground'>
          Meine Tipps für offene Wetten
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-6'>
        {submittedEvents.map((event) => {
          const otherTips =
            allTipsPerEvent[event.id]?.filter((t) => t.userId !== user.id) ||
            [];

          return (
            <div
              key={event.id}
              className='rounded-lg border border-border bg-card p-4 sm:p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow relative'
            >
              {/* Admin Menü */}
              {user.id === groupCreatedBy && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute top-2 right-2 text-muted-foreground hover:text-foreground'
                    >
                      <MoreHorizontal className='h-4 w-4' />
                      <span className='sr-only'>Optionen</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={() => onInitiateDeleteEvent(event)}
                      className='text-red-600 focus:text-red-600'
                    >
                      <Trash2 className='w-4 h-4 mr-2' />
                      Event löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className='space-y-1 pr-8'>
                <div className='flex justify-between gap-2 items-start'>
                  <h4 className='text-sm font-semibold text-foreground break-words flex-1'>
                    {event.title}
                  </h4>
                  {/* Das Dropdown-Menü ist bereits absolut, daher genügt Platz rechts */}
                </div>
                {event.question && (
                  <p className='text-xs text-muted-foreground italic'>
                    {event.question}
                  </p>
                )}
                <p className='text-sm text-muted-foreground pt-1'>
                  Deine Antwort: <strong>{userSubmittedTips[event.id]}</strong>
                </p>
              </div>

              {otherTips.length > 0 && (
                <div className='pt-3 border-t border-border/60 text-sm'>
                  <p className='mb-1.5 text-muted-foreground font-medium text-xs uppercase tracking-wider'>
                    Tipps der anderen:
                  </p>
                  <ul className='text-sm space-y-1.5'>
                    {otherTips.map((t) => (
                      <li
                        key={t.userId}
                        className='flex justify-between items-center'
                      >
                        <span className='text-muted-foreground'>
                          {t.userName || `User ${t.userId}`}
                        </span>
                        <Badge variant='secondary' className='font-normal'>
                          {t.selectedOption}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
