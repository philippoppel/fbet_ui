// src/app/api/lib/tipSchema.ts
import { z } from 'zod';

export const tipCreateSchema = z.object({
  event_id: z.number().int().positive('Gültige Event-ID erforderlich'),
  selected_option: z.string().min(1, 'Eine Option muss ausgewählt sein'),
});

export type TipCreateInput = z.infer<typeof tipCreateSchema>;
