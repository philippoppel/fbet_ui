// src/app/register/page.tsx
'use client';

import { useState, Suspense } from 'react'; // Suspense importieren
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams importieren
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { registerUser, ApiError } from '@/lib/api';
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

const formSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email({ message: 'Bitte gib eine gültige E-Mail ein.' }),
    password: z
      .string()
      .min(8, { message: 'Passwort muss mindestens 8 Zeichen lang sein.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein.',
    path: ['confirmPassword'],
  });

// Eigene Komponente für den Inhalt
function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook hier verwenden
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect-Pfad aus der URL lesen
  const redirectPath = searchParams.get('redirect');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log('Versuche Registrierung für:', values.email);

    try {
      await registerUser({
        email: values.email,
        name: values.name || null,
        password: values.password,
      });

      toast.success('Registrierung erfolgreich!', {
        description: 'Du wirst zum Login weitergeleitet.',
      });
      console.log(
        'Registrierung erfolgreich, leite weiter zu /login mit redirect'
      );

      // Leite zum Login weiter, aber HÄNGE DEN REDIRECT-PARAMETER AN!
      // Encode den redirectPath, falls er Sonderzeichen enthält (z.B. das zweite '?')
      const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath || '')}`;
      router.push(loginUrl);
    } catch (err) {
      console.error('Registrierung fehlgeschlagen', err);
      let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
      if (err instanceof ApiError && err.detail) {
        errorMessage =
          typeof err.detail === 'string'
            ? err.detail
            : JSON.stringify(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error('Registrierung fehlgeschlagen', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader>
        <CardTitle className='text-2xl'>Registrieren</CardTitle>
        <CardDescription>
          Erstelle ein neues Konto, um loszulegen.
          {redirectPath && (
            <p className='text-sm text-blue-600 mt-2'>
              Du wirst nach dem Login weitergeleitet.
            </p>
          )}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          {' '}
          {/* Weniger Abstand als space-y-8 */}
          <CardContent className='grid gap-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  {' '}
                  <FormLabel>Name (Optional)</FormLabel>{' '}
                  <FormControl>
                    <Input placeholder='Dein Name' {...field} />
                  </FormControl>{' '}
                  <FormMessage />{' '}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  {' '}
                  <FormLabel>E-Mail</FormLabel>{' '}
                  <FormControl>
                    <Input
                      placeholder='deine@email.de'
                      type='email'
                      {...field}
                    />
                  </FormControl>{' '}
                  <FormMessage />{' '}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  {' '}
                  <FormLabel>Passwort</FormLabel>{' '}
                  <FormControl>
                    <Input placeholder='********' type='password' {...field} />
                  </FormControl>{' '}
                  <FormMessage />{' '}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  {' '}
                  <FormLabel>Passwort bestätigen</FormLabel>{' '}
                  <FormControl>
                    <Input placeholder='********' type='password' {...field} />
                  </FormControl>{' '}
                  <FormMessage />{' '}
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className='flex flex-col gap-4 pt-0'>
            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              {isSubmitting ? 'Registriere...' : 'Konto erstellen'}
            </Button>
            <p className='text-sm text-muted-foreground'>
              Bereits ein Konto?{' '}
              <Link
                // Wichtig: Redirect-Parameter auch an Login weitergeben!
                href={`/login?redirect=${encodeURIComponent(redirectPath || '')}`}
                className='underline hover:text-foreground'
              >
                Zum Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Hauptkomponente mit Suspense
export default function RegisterPage() {
  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <Suspense
        fallback={
          <div className='flex items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2'>Lade Registrierung...</span>
          </div>
        }
      >
        <RegisterContent />
      </Suspense>
    </div>
  );
}
