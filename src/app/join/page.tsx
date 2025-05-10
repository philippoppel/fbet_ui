// src/app/join/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Loader2, LogIn, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Group, GroupMembership } from '@/app/lib/types'; // Group weiterhin für Details nach Erfolg
import { toast } from 'sonner';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { ApiError, joinGroupByInviteToken } from '@/app/lib/api';

// Diese Komponente enthält die Logik, die useSearchParams benötigt
function JoinGroupContent() {
  const [hasMounted, setHasMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token: authToken, isLoading: isAuthLoading } = useAuth();

  const [inviteTokenParam, setInviteTokenParam] = useState<string | null>(null);

  // Status-States
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinedGroupInfo, setJoinedGroupInfo] = useState<{
    id: number;
    name?: string;
  } | null>(null);

  useEffect(() => {
    // Dieser Effekt wird nur auf dem Client ausgeführt
    setHasMounted(true);
    // Lese searchParams erst, nachdem die Komponente clientseitig gemountet wurde
    setInviteTokenParam(searchParams.get('token'));
  }, [searchParams]); // Abhängigkeit von searchParams

  // Effekt, um frühzeitig Fehler anzuzeigen oder Aktionen auszulösen
  useEffect(() => {
    if (!hasMounted || isAuthLoading) return; // Nur ausführen, wenn gemountet und Auth nicht lädt

    if (!inviteTokenParam && user) {
      setError('Ungültiger oder fehlender Einladungslink.');
    } else if (!inviteTokenParam && !user) {
      // Kein Token, nicht eingeloggt -> UI zeigt Login/Register Buttons, kein expliziter Fehler hier nötig
      // Die UI unten wird diesen Fall abdecken.
    }
  }, [inviteTokenParam, isAuthLoading, user, hasMounted]);

  const handleJoin = async () => {
    if (!inviteTokenParam || !user || !authToken) {
      setError('Fehler: Nicht eingeloggt oder ungültiger Einladungslink.');
      return;
    }
    setIsJoining(true);
    setError(null);
    setJoinSuccess(false);
    setJoinedGroupInfo(null);
    try {
      const membership: GroupMembership = await joinGroupByInviteToken(
        authToken,
        inviteTokenParam
      );
      setJoinedGroupInfo({
        id: membership.groupId,
        name: membership.group?.name, // group ist optional im Typ GroupMembership
      });
      setJoinSuccess(true);
      toast.success(`Erfolgreich der Gruppe beigetreten!`);
      router.push(`/dashboard?group=${membership.groupId}`);
    } catch (err) {
      console.error('Fehler beim Beitreten via Token:', err);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Conflict
          setError('Du bist bereits Mitglied dieser Gruppe.');
          setJoinSuccess(true); // Dennoch als "Erfolg" werten für die UI
          // Versuche, Gruppen-Infos aus dem Fehlerdetail zu bekommen (falls vom Backend gesendet)
          const detail = err.detail as any; // Typzusicherung, um auf group_id etc. zuzugreifen
          const conflictingGroupId = detail?.group_id || detail?.groupId;
          const conflictingGroupName = detail?.group_name || detail?.groupName;

          if (conflictingGroupId) {
            setJoinedGroupInfo({
              id: conflictingGroupId,
              name: conflictingGroupName,
            });
            router.push(`/dashboard?group=${conflictingGroupId}`);
          } else {
            // Fallback, wenn keine ID im Fehlerdetail ist
            router.push('/dashboard');
          }
        } else if (
          err.status === 404 ||
          err.status === 400 ||
          err.status === 422
        ) {
          setError(
            'Einladungslink ungültig, abgelaufen oder Gruppe nicht gefunden.'
          );
        } else if (err.status === 403) {
          setError('Du hast keine Berechtigung, dieser Gruppe beizutreten.');
        } else {
          setError(
            `Fehler (${err.status}): ${err.detail || err.message || 'Unbekannter API-Fehler'}`
          );
        }
      } else if (err instanceof Error) {
        setError(`Fehler: ${err.message}`);
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
      // Erfolgsstatus nur zurücksetzen, wenn es kein 409-Konflikt war
      if (!(err instanceof ApiError && err.status === 409)) {
        setJoinSuccess(false);
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Initialer Render, bevor hasMounted true ist (muss mit Suspense Fallback übereinstimmen)
  if (!hasMounted) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[300px]'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
        <span>Lade Beitrittsseite...</span>
      </div>
    );
  }

  // Ladezustand (Auth oder Beitritt)
  if (isAuthLoading || isJoining) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[300px]'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
        <span>
          {isJoining ? 'Tritt Gruppe bei...' : 'Lade Benutzerdaten...'}
        </span>
      </div>
    );
  }

  // Fall: Nicht eingeloggt
  if (!user) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Gruppe beitreten</CardTitle>
          <CardDescription>
            Um der Einladung zu folgen, musst du dich zuerst anmelden oder
            registrieren.
          </CardDescription>
        </CardHeader>
        <CardFooter className='flex flex-col sm:flex-row justify-end gap-2'>
          <Button variant='outline' asChild className='w-full sm:w-auto'>
            <Link
              href={`/register?redirect=/join?token=${inviteTokenParam || ''}`}
            >
              Registrieren
            </Link>
          </Button>
          <Button asChild className='w-full sm:w-auto'>
            <Link
              href={`/login?redirect=/join?token=${inviteTokenParam || ''}`}
            >
              <LogIn className='mr-2 h-4 w-4' /> Anmelden
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Fall: Fehler (außer "Bereits Mitglied" bei Erfolg)
  if (
    error &&
    !(joinSuccess && error === 'Du bist bereits Mitglied dieser Gruppe.')
  ) {
    return (
      <Card className='w-full max-w-md mx-auto border-destructive'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5' /> Fehler beim Beitritt
          </CardTitle>
          <CardDescription className='text-destructive'>
            {error}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant='outline' asChild>
            <Link href='/dashboard'>Zum Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Fall: Erfolgreich beigetreten (oder bereits Mitglied)
  if (joinSuccess) {
    const isAlreadyMember = error === 'Du bist bereits Mitglied dieser Gruppe.';
    return (
      <Card className='w-full max-w-md mx-auto border-green-500'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-green-600'>
            <CheckCircle className='h-5 w-5' />
            {isAlreadyMember ? 'Bereits Mitglied' : 'Erfolgreich beigetreten!'}
          </CardTitle>
          <CardDescription>
            Du bist {isAlreadyMember ? 'bereits' : 'jetzt'} Mitglied der Gruppe
            <strong>
              {joinedGroupInfo?.name ??
                `(ID: ${joinedGroupInfo?.id ?? 'unbekannt'})`}
            </strong>
            .
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href={`/dashboard?group=${joinedGroupInfo?.id ?? ''}`}>
              Zur Gruppe im Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Fall: Eingeloggt, Token vorhanden, bereit zum Beitreten
  if (inviteTokenParam && user && !error && !joinSuccess) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Gruppe beitreten</CardTitle>
          <CardDescription>
            Du wurdest eingeladen, einer Tipprunde beizutreten. Klicke auf
            &#34;Beitreten&#34;, um die Einladung anzunehmen.
          </CardDescription>
        </CardHeader>
        <CardFooter className='flex justify-end'>
          <Button
            onClick={handleJoin}
            disabled={isJoining || !inviteTokenParam}
          >
            {isJoining && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
            {isJoining ? 'Tritt bei...' : 'Beitreten'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Fallback, wenn inviteTokenParam null ist, aber user eingeloggt ist (sollte durch useEffect oben abgefangen werden)
  if (!inviteTokenParam && user) {
    return (
      <Card className='w-full max-w-md mx-auto border-destructive'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5' /> Fehler
          </CardTitle>
          <CardDescription className='text-destructive'>
            Der Einladungslink ist ungültig oder fehlt. Bitte überprüfe den
            Link.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant='outline' asChild>
            <Link href='/dashboard'>Zum Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Allgemeiner Fallback, sollte idealerweise nicht erreicht werden
  return (
    <div className='flex flex-col items-center justify-center min-h-[300px]'>
      <AlertTriangle className='h-8 w-8 text-muted-foreground mb-4' />
      <span>Ein unerwarteter Zustand ist eingetreten.</span>
    </div>
  );
}

// Die Hauptseite, die Suspense für useSearchParams bereitstellt
export default function JoinPage() {
  return (
    // SiteLayout wird bereits vom RootLayout gerendert, hier nicht nochmal wrappen,
    // es sei denn, JoinPage soll ein komplett anderes äußeres Layout haben.
    // Für eine einfache zentrierte Seite ist ein div ausreichend.
    <div className='container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]'>
      {/* Beispiel für Mindesthöhe */}
      <Suspense
        fallback={
          <div className='flex flex-col items-center justify-center min-h-[300px]'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
            <span>Lade Beitrittsseite...</span>
          </div>
        }
      >
        <JoinGroupContent />
      </Suspense>
    </div>
  );
}
