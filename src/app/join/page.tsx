// src/app/join/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
// Stelle sicher, dass die neue Funktion importiert wird und GroupMembership auch
import { joinGroupByToken, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Group, GroupMembership } from '@/lib/types'; // Group weiterhin für Details nach Erfolg
import { toast } from 'sonner';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Helper-Komponente, um useSearchParams zu verwenden (wegen Suspense)
function JoinGroupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Auth-Token umbenannt für Klarheit gegenüber Invite-Token
  const { user, token: authToken, isLoading: isAuthLoading } = useAuth();
  // Lese den 'token' Parameter aus der URL
  const inviteTokenParam = searchParams.get('token');

  // Status-States
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Zustände für Gruppendetails (werden erst *nach* erfolgreichem Beitritt gefüllt)
  const [joinedGroupInfo, setJoinedGroupInfo] = useState<{
    id: number;
    name?: string;
  } | null>(null);

  // Effekt, um frühzeitig Fehler anzuzeigen, wenn kein Token vorhanden ist
  useEffect(() => {
    if (!isAuthLoading && !inviteTokenParam && !user) {
      // Zeige Fehler nur an, wenn Auth geladen ist, kein Token da ist UND der User nicht eingeloggt ist
      // Wenn User eingeloggt ist, aber kein Token da ist, wird dies unten behandelt
    } else if (!isAuthLoading && !inviteTokenParam && user) {
      setError('Ungültiger oder fehlender Einladungslink.');
    }
  }, [inviteTokenParam, isAuthLoading, user]);

  // Funktion zum Beitreten über den Token
  const handleJoin = async () => {
    // Prüfe, ob Auth-Token und Invite-Token vorhanden sind
    if (!inviteTokenParam || !user || !authToken) {
      setError('Fehler: Nicht eingeloggt oder ungültiger Einladungslink.');
      // Eigentlich sollte der Button in diesem Fall nicht klickbar sein (siehe Render-Logik)
      return;
    }

    setIsJoining(true);
    setError(null);
    setJoinSuccess(false);
    setJoinedGroupInfo(null);

    try {
      // Rufe die neue API-Funktion auf
      const membership: GroupMembership = await joinGroupByToken(
        authToken,
        inviteTokenParam
      );

      // Speichere relevante Infos aus der Antwort (mindestens die ID)
      setJoinedGroupInfo({
        id: membership.group_id,
        // Optional: Name aus Membership holen, falls Backend es hinzufügt, sonst bleibt er undefined
        name: membership.group?.name, // Annahme: Backend nistet Group-Infos in Membership
      });

      setJoinSuccess(true);
      toast.success(`Erfolgreich der Gruppe beigetreten!`);

      // Weiterleiten zum Dashboard mit der erhaltenen Gruppen-ID
      router.push(`/dashboard?group=${membership.group_id}`);
    } catch (err) {
      console.error('Fehler beim Beitreten via Token:', err);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Conflict - Bereits Mitglied
          setError('Du bist bereits Mitglied dieser Gruppe.');
          setJoinSuccess(true); // Dennoch als "Erfolg" werten
          // Hier bräuchten wir die Gruppen-ID aus dem Fehler oder einem separaten API-Call,
          // um den Link zum Dashboard korrekt zu setzen. Vereinfachung: Leite einfach weiter.
          // TODO: Evtl. Gruppen-ID aus Fehlerdetails extrahieren oder API anpassen.
          // Annahme: Wir leiten einfach zum Dashboard weiter, die Gruppe wird dort schon sichtbar sein.
          // Oder versuche die ID aus dem Fehler zu bekommen, falls das Backend sie mitschickt:
          // const conflictingGroupId = err.detail?.group_id; // Beispiel
          // if (conflictingGroupId) setJoinedGroupInfo({ id: conflictingGroupId });
          router.push('/dashboard'); // Einfache Weiterleitung
        } else if (
          err.status === 404 ||
          err.status === 400 ||
          err.status === 422
        ) {
          // Not Found / Bad Request / Unprocessable Entity (ungültiger Token)
          setError(
            'Einladungslink ungültig, abgelaufen oder Gruppe nicht gefunden.'
          );
        } else if (err.status === 403) {
          // Forbidden
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
      // Stelle sicher, dass bei Fehler der Erfolgsstatus zurückgesetzt wird (außer bei 409)
      if (!(err instanceof ApiError && err.status === 409)) {
        setJoinSuccess(false);
      }
    } finally {
      setIsJoining(false);
    }
  };

  // --- Render-Logik ---

  // 1. Ladezustand (Auth oder Beitritt)
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

  // 2. Fall: Nicht eingeloggt
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
        <CardFooter className='flex justify-end gap-2'>
          <Button variant='outline' asChild>
            {/* Hänge den inviteToken an die Redirect-URL an */}
            <Link
              href={`/register?redirect=/join?token=${inviteTokenParam || ''}`}
            >
              Registrieren
            </Link>
          </Button>
          <Button asChild>
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

  // 3. Fall: Fehler (z.B. ungültiger Token, API-Fehler), aber nicht der "Bereits Mitglied"-Fall
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

  // 4. Fall: Erfolgreich beigetreten (oder bereits Mitglied)
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
            Du bist {isAlreadyMember ? 'bereits' : 'jetzt'} Mitglied der Gruppe{' '}
            {/* Zeige Namen wenn verfügbar, sonst ID */}
            <strong>
              {joinedGroupInfo?.name ?? `(ID: ${joinedGroupInfo?.id})`}
            </strong>
            .
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            {/* Link zur Gruppe im Dashboard, auch wenn schon Mitglied */}
            <Link href={`/dashboard?group=${joinedGroupInfo?.id}`}>
              Zur Gruppe im Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // 5. Fall: Eingeloggt, Token vorhanden, bereit zum Beitreten
  if (inviteTokenParam && user && !error && !joinSuccess) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>Gruppe beitreten</CardTitle>
          <CardDescription>
            Du wurdest eingeladen, einer Tipprunde beizutreten. Klicke auf
            &#34;Beitreten&#34;, um die Einladung anzunehmen.
            {/* Optional: Hier könnten später Infos zum Einladenden stehen, wenn Backend sie liefert */}
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

  // 6. Fallback (Sollte nur erreicht werden, wenn Token fehlt NACH dem Login,
  // was durch useEffect oben eigentlich abgefangen wird, aber als Sicherheit)
  return (
    <Card className='w-full max-w-md mx-auto border-destructive'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-destructive'>
          <AlertTriangle className='h-5 w-5' /> Fehler
        </CardTitle>
        <CardDescription className='text-destructive'>
          Ungültiger oder fehlender Einladungslink.
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

// Die Hauptseite, die Suspense für useSearchParams bereitstellt
export default function JoinPage() {
  return (
    <div className='container mx-auto px-4 py-12 flex justify-center'>
      <Suspense
        fallback={
          // Generischer Ladeindikator für die Suspense-Boundary
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
