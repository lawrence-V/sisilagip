import { z } from 'zod';

export const appSettingsSchema = z.object({
  eventName: z
    .string()
    .trim()
    .min(2, 'Event name must contain at least 2 characters.')
    .max(40, 'Event name cannot exceed 40 characters.'),
  receiptFooter: z
    .string()
    .trim()
    .min(2, 'Footer message must contain at least 2 characters.')
    .max(80, 'Footer message cannot exceed 80 characters.'),
  autoPrint: z.boolean(),
  printCopies: z.number().int().min(1).max(5),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
