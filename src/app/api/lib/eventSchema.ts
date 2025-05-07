// src/app/api/lib/eventSchema.ts (oder wo deine Event-Schemas liegen)
import { z } from 'zod';

export const eventResultSetSchema = z.object({
  event_id: z.number().int().positive('Gültige Event-ID erforderlich'),
  winning_option: z.string().min(1, 'Gewinnende Option darf nicht leer sein'),
});

export type EventResultSetInput = z.infer<typeof eventResultSetSchema>;
