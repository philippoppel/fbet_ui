// src/app/api/lib/groupSchema.ts
import { z } from 'zod';

export const groupCreateSchema = z.object({
  name: z.string().min(1, { message: 'Group name cannot be empty' }).max(100),
  description: z.string().max(500).nullable().optional(),
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;

// Optional: Wenn du spezifische Schemas für Updates oder andere Operationen benötigst
// export const groupUpdateSchema = z.object({ ... });
