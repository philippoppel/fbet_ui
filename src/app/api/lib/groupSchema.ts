// src/app/api/lib/groupSchema.ts
import { z } from 'zod';

export const groupCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional(),
});

export const groupUpdateSchema = z.object({
  imageUrl: z.string().url().nullable().optional(), // null = remove
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;

// Optional: Wenn du spezifische Schemas für Updates oder andere Operationen benötigst
// export const groupUpdateSchema = z.object({ ... });
