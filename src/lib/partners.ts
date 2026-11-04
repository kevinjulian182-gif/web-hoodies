import { z } from 'zod';
import { STORE_PAYER } from '@/lib/accountingConfig';

export const partnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre.')
    .max(60)
    .refine((n) => n.toLowerCase() !== STORE_PAYER.toLowerCase(), `«${STORE_PAYER}» ya existe.`),
  phone: z.string().trim().max(20).optional(),
  role: z.string().trim().max(30).optional(),
});
