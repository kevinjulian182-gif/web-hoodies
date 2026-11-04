import { z } from 'zod';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, TZ_OFFSET } from '@/lib/accountingConfig';

/** An expense or income entered by hand (create and edit share it). */
export const entrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.string(),
    description: z.string().trim().min(2, 'Escribe una descripción.'),
    amountCents: z.number().int().positive('Escribe el valor.'),
    method: z.enum(PAYMENT_METHODS),
    paidBy: z.string().trim().max(60).optional(),
    reference: z.string().trim().optional(),
  })
  .refine(
    (d) => (d.type === 'INCOME' ? (INCOME_CATEGORIES as readonly string[]) : (EXPENSE_CATEGORIES as readonly string[])).includes(d.category),
    { message: 'Elige una categoría.' }
  );

export function entryFields(data: z.infer<typeof entrySchema>) {
  const { date, reference, paidBy, ...rest } = data;
  return { ...rest, reference: reference || null, paidBy: paidBy || null, date: new Date(`${date}T12:00:00${TZ_OFFSET}`) };
}
