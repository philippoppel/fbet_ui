// src/app/api/lib/tipSchema.ts
import { z } from 'zod';

export const tipCreateSchema = z.object({
  event_id: z.number().int().positive(),
  selected_option: z.string().min(1),
  wildcard_guess: z.string().optional(),
});

export type TipCreateInput = z.infer<typeof tipCreateSchema>;
