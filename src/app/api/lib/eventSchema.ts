import { z } from 'zod';

/* ---------- Ergebnis setzen ---------- */
export const eventResultSetSchema = z.object({
  event_id: z.number().int().positive(),
  winning_option: z.string().min(1),
  wildcard_answer: z.string().optional(), // ➊
});

/* ---------- Event anlegen ------------ */
export const eventCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  group_id: z.number().int().positive(),
  question: z.string().min(1).max(255),
  options: z.array(z.string().min(1).max(255)).min(2),
  tippingDeadline: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => !d || d > new Date(), {
      message: 'Tipp-Deadline muss in der Zukunft liegen.',
    }),

  /* Wildcard-Felder */
  has_wildcard: z.boolean().default(false),
  wildcard_type: z.enum(['EXACT_SCORE', 'ROUND_FINISH', 'GENERIC']).optional(),
  wildcard_prompt: z.string().optional(),
});
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
