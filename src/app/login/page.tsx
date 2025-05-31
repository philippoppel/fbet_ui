'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';

/* ------------------ Validation ------------------ */
const schema = z.object({
  email: z.string().email('Gib eine gültige E‑Mail an.'),
  password: z.string().min(1, 'Bitte Passwort eingeben.'),
});

type FormData = z.infer<typeof schema>;

/* ------------------ Inner content ------------------ */
function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  /* Auto‑redirect if already authed */
  useEffect(() => {
    if (!authLoading && user) router.replace(redirectPath);
  }, [authLoading, user, redirectPath, router]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    const ok = await login(values.email, values.password);
    setSubmitting(false);
    if (ok) {
      toast.success('Willkommen zurück!');

      // NEU: Event für PWA Installations-Aufforderung auslösen
      window.dispatchEvent(new CustomEvent('successfulLoginForPwaPrompt'));

      router.replace(redirectPath);
    } else {
      toast.error('Login fehlgeschlagen', {
        description: 'Bitte Daten prüfen.',
      });
    }
  };

  if (authLoading || user) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-20'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>Lade…</p>
      </div>
    );
  }

  return (
    <Card className='w-full max-w-md shadow-xl border-border/60 bg-card/80 backdrop-blur'>
      <CardHeader className='text-center space-y-2'>
        <img src='/icon0.svg' aria-hidden height={36} className='mx-auto' />
        <CardTitle className='text-2xl font-bold tracking-tight'>
          Anmelden
        </CardTitle>
        <CardDescription>Schön, dich zu sehen! Logge dich ein.</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form
          name='login' /* hilft Chrome/Safari‑Heuristik */
          method='post' /* notwendig für einige AutoFill‑Scanner */
          action='/login' /* fiktiv – verhindert echtes Reload */
          autoComplete='on'
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6 p-6 pt-0'
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>E‑Mail</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id='email'
                    name='username' /* <- entscheidend */
                    type='email'
                    inputMode='email'
                    autoComplete='username'
                    placeholder='name@example.com'
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
                  <div className='relative'>
                    <Input
                      {...field}
                      id='password'
                      name='password'
                      type={pwVisible ? 'text' : 'password'}
                      autoComplete='current-password'
                      placeholder='••••••••'
                    />
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      className='absolute right-0 top-0 h-full w-9 text-muted-foreground'
                      onClick={() => setPwVisible((v) => !v)}
                      tabIndex={-1}
                    >
                      {pwVisible ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' className='w-full' disabled={submitting}>
            {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            <br />
            Anmelden
          </Button>
        </form>
      </Form>

      <CardFooter className='flex flex-col gap-4 pt-0'>
        <p className='text-sm text-muted-foreground text-center w-full'>
          Neu hier?
          <br />
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectPath)}`}
            className='underline underline-offset-4 hover:text-foreground'
          >
            Konto erstellen
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

/* ------------------ Page wrapper ------------------ */
export default function LoginPage() {
  return (
    <div className='min-h-dvh flex items-center justify-center bg-gradient-to-b from-background to-slate-50 dark:from-slate-900 dark:to-slate-800 p-4'>
      <Suspense
        fallback={
          <div className='flex flex-col items-center gap-3 py-20'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>Lade Login…</p>
          </div>
        }
      >
        <LoginCard />
      </Suspense>
    </div>
  );
}
