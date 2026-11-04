import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const sizeChartSchema = z
  .object({
    columns: z.array(z.string().max(40)).max(8),
    rows: z.record(z.string(), z.array(z.string().max(20))),
    note: z.string().max(300).optional(),
  })
  .nullable()
  .optional();

// Prisma won't accept a bare `null` for a Json? column — clearing it needs
// the DbNull sentinel; undefined leaves the stored chart untouched.
export function toSizeChartData(value: z.infer<typeof sizeChartSchema>) {
  return value === null ? Prisma.DbNull : value;
}
