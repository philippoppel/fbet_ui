// src/app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react'; // Suspense importieren
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams importieren
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react'; // Für Ladeanzeige

const formSchema = z.object({
  email: z
    .string()
    .email({ message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }),
  password: z.string().min(1, { message: 'Bitte gib dein Passwort ein.' }),
});

// Eigene Komponente für den Inhalt, um useSearchParams verwenden zu können
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook hier verwenden
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect-Pfad aus der URL lesen
  const redirectPath = searchParams.get('redirect');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  // Redirect Logic, wenn User bereits eingeloggt ist (beim Laden der Seite)
  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      const targetPath = redirectPath || '/dashboard';
      console.log(
        `LoginContent Effect: User logged in, redirecting to ${targetPath}`
      );
      router.replace(targetPath);
    }
  }, [auth.isLoading, auth.user, router, redirectPath]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log('Versuche Login für:', values.email);
    const success = await auth.login(values.email, values.password);
    setIsSubmitting(false);
    if (success) {
      toast.success('Login erfolgreich!');
      // Nach erfolgreichem Login zum redirectPath oder /dashboard weiterleiten
      // Der useEffect oben wird dies auch tun, aber hier ist es expliziter nach dem Klick
      const targetPath = redirectPath || '/dashboard';
      console.log(`Login Submit Success: Redirecting to ${targetPath}`);
      router.replace(targetPath); // router.replace, um nicht im Verlauf zu landen
    } else {
      toast.error('Login fehlgeschlagen', {
        description:
          auth.error || 'Bitte überprüfe deine E-Mail und dein Passwort.',
      });
      console.error('Login fehlgeschlagen:', auth.error);
    }
  }

  // --- Konditionale Render-Logik innerhalb von LoginContent ---
  if (auth.isLoading || (!auth.isLoading && auth.user)) {
    // Zeige Ladeanzeige, während Auth lädt oder der Redirect im useEffect vorbereitet wird
    return (
      <div className='flex items-center justify-center min-h-[300px]'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-2'>Wird geladen...</span>
      </div>
    );
  }

  // Nur wenn NICHT geladen wird UND KEIN User eingeloggt ist, zeige das Formular:
  return (
    <Card className='w-full max-w-sm'>
      <CardHeader>
        <CardTitle className='text-2xl'>Login</CardTitle>
        <CardDescription>
          Gib deine E-Mail und dein Passwort ein, um dich anzumelden.
          {redirectPath && (
            <p className='text-sm text-blue-600 mt-2'>
              Du wirst nach dem Login weitergeleitet.
            </p>
          )}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <CardContent className='grid gap-4'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Mail</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='deine@email.de'
                      type='email'
                      autoComplete='email'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passwort</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='********'
                      type='password'
                      autoComplete='current-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className='flex flex-col gap-4 pt-0'>
            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              {isSubmitting ? 'Logge ein...' : 'Login'}
            </Button>
            <p className='text-center text-sm text-muted-foreground'>
              Noch kein Konto?{' '}
              <Link
                // Wichtig: Redirect-Parameter auch an Registrierung weitergeben!
                href={`/register?redirect=${encodeURIComponent(redirectPath || '')}`}
                className='underline hover:text-foreground'
              >
                Registrieren
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Hauptkomponente, die Suspense bereitstellt
export default function LoginPage() {
  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <Suspense
        fallback={
          <div className='flex items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2'>Lade Login...</span>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
