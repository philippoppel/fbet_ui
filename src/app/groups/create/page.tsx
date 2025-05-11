'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { useAuth } from '@/app/context/AuthContext';
import { createGroup, ApiError } from '@/app/lib/api';
import type { GroupCreate } from '@/app/lib/types';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';

// ───────── Zod-Schema inkl. Bild ─────────
const MB = 1024 * 1024;

const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Gruppenname muss mindestens 3 Zeichen lang sein.' }),
  description: z.string().optional(),
  imageFile: z
    .custom<File>() // ← nur File, kein FileList
    .refine((file) => !file || file.size <= 4 * MB, {
      message: 'Bild darf höchstens 4 MB groß sein.',
    })
    .optional(),
});

export default function CreateGroupPage() {
  const router = useRouter();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!auth.isLoading && !auth.user) router.replace('/login');
  }, [auth.isLoading, auth.user, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', imageFile: undefined },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth.token) {
      toast.error('Nicht eingeloggt', {
        description: 'Du musst eingeloggt sein, um eine Gruppe zu erstellen.',
      });
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;

    // ───────── Bild hochladen ─────────
    if (values.imageFile) {
      try {
        const fd = new FormData();
        fd.append('file', values.imageFile);

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Upload fehlgeschlagen');
        imageUrl = data.url;
      } catch (err) {
        toast.error('Bild-Upload fehlgeschlagen', {
          description: err instanceof Error ? err.message : String(err),
        });
        setIsSubmitting(false);
        return;
      }
    }

    // ───────── Gruppe erstellen ─────────
    try {
      const payload: GroupCreate = {
        name: values.name,
        description: values.description || null,
        imageUrl: imageUrl || undefined,
      };

      const newGroup = await createGroup(auth.token, payload);
      toast.success('Gruppe erfolgreich erstellt!', {
        description: `Gruppe "${newGroup.name}" wurde angelegt.`,
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Fehler beim Erstellen der Gruppe', err);
      const errorMessage =
        err instanceof ApiError && err.detail
          ? typeof err.detail === 'string'
            ? err.detail
            : JSON.stringify(err.detail)
          : err instanceof Error
            ? err.message
            : 'Ein unerwarteter Fehler ist aufgetreten.';
      toast.error('Fehler beim Erstellen der Gruppe', {
        description: errorMessage,
      });
      setIsSubmitting(false);
    }
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
        <CardHeader>
          <CardTitle className='text-2xl'>Neue Gruppe erstellen</CardTitle>
          <CardDescription>
            Gib deiner Tipprunde einen Namen, eine optionale Beschreibung &amp;
            ein Bild.
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <CardContent className='grid gap-4'>
              {/* Name */}
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

              {/* Beschreibung */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (optional)</FormLabel>
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

              {/* Bild */}
              <FormField
                control={form.control}
                name='imageFile'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gruppenbild (optional, max. 4 MB)</FormLabel>
                    <FormControl>
                      <Input
                        type='file'
                        accept='image/*'
                        onChange={(e) => {
                          const f = e.target.files?.[0]; // EIN File oder undefined
                          form.setValue('imageFile', f); // RHF-Setter
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className='flex justify-between'>
              <Link href='/dashboard' passHref>
                <Button type='button' variant='outline'>
                  Abbrechen
                </Button>
              </Link>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Erstelle…' : 'Gruppe erstellen'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
