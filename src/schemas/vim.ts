import { z } from 'zod';
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const ascii = z.string().regex(/^[\x20-\x7e]*$/, '출력 가능한 ASCII만');
export const vimLessonSchema = z
  .object({
    id: slug,
    category: z.literal('vim'),
    order: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    initial: z.array(ascii).min(1),
    steps: z
      .array(
        z
          .object({
            id: slug,
            prompt: z.string().min(1),
            keys: ascii.min(1),
            checks: z.array(z.enum(['saved', 'register'])).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type VimLessonData = z.infer<typeof vimLessonSchema>;
