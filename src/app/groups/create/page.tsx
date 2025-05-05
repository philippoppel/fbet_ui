// src/app/groups/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { createGroup, ApiError } from '@/lib/api';
import type { GroupCreate } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea'; // Textarea für Beschreibung
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Zod Schema für Gruppenerstellung
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Gruppenname muss mindestens 3 Zeichen lang sein.' }),
  description: z.string().optional(),
});

export default function CreateGroupPage() {
  const router = useRouter();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.replace('/login');
    }
  }, [auth.isLoading, auth.user, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth.token) {
      toast.error('Nicht eingeloggt', {
        description: 'Du musst eingeloggt sein, um eine Gruppe zu erstellen.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const newGroup = await createGroup(auth.token, {
        name: values.name,
        description: values.description || null,
      });
      toast.success('Gruppe erfolgreich erstellt!', {
        description: `Gruppe "${newGroup.name}" wurde angelegt.`,
      });
      router.push(`/dashboard`);
    } catch (err) {
      console.error('Fehler beim Erstellen der Gruppe', err);
      let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
      if (err instanceof ApiError && err.detail) {
        errorMessage =
          typeof err.detail === 'string'
            ? err.detail
            : JSON.stringify(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error('Fehler beim Erstellen der Gruppe', {
        description: errorMessage,
      });
      setIsSubmitting(false); // Bleibe auf der Seite bei Fehler
    }
    // setIsSubmitting wird bei Erfolg durch Redirect verlassen
  }

  if (auth.isLoading || !auth.user) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div>Wird geladen...</div>
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-background'>
      <Card className='w-full max-w-lg'>
        {' '}
        {/* Etwas breiter */}
        <CardHeader>
          <CardTitle className='text-2xl'>Neue Gruppe erstellen</CardTitle>
          <CardDescription>
            Gib deiner Tipprunde einen Namen und eine optionale Beschreibung.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <CardContent className='grid gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gruppenname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='z.B. WM-Tipprunde Bürogemeinschaft'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Regeln, Einsatz, etc.'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className='flex justify-between'>
              {' '}
              {/* Buttons nebeneinander */}
              <Link href='/dashboard' passHref>
                <Button type='button' variant='outline'>
                  Abbrechen
                </Button>{' '}
                {/* type="button" wichtig */}
              </Link>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Erstelle...' : 'Gruppe erstellen'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
