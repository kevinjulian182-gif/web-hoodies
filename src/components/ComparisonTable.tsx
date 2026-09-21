'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';
import type { Product } from '@prisma/client';

function firstLine(text: string | null): string {
  if (!text) return '—';
  return text.split('\n')[0].trim() || '—';
}

export default function ComparisonTable({ current, others }: { current: Product; others: Product[] }) {
  if (others.length === 0) return null;
  const columns = [current, ...others];

  return (
    <div className="border-t border-cream-200 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-6xl px-6"
      >
        <h2 className="text-2xl font-semibold tracking-tightest text-coffee-900">Compara con otras piezas</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32" />
                {columns.map((p) => (
                  <th key={p.id} className="px-3 pb-4 text-left align-bottom">
                    <Link href={`/productos/${p.slug}`} className="group block">
                      <div className="relative aspect-square w-20 overflow-hidden rounded-xl bg-cream-50">
                        {p.images[0] && (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                            sizes="80px"
                          />
                        )}
                      </div>
                      <p className="mt-2 max-w-[9rem] text-xs font-medium leading-snug text-coffee-900 transition-colors group-hover:text-coffee-600 group-hover:underline">
                        {p.id === current.id ? 'Este producto' : p.name}
                      </p>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              <Row label="Precio" values={columns.map((p) => formatCOP(p.priceCents))} />
              <Row label="Materiales" values={columns.map((p) => firstLine(p.materials))} />
              <Row label="Tallas" values={columns.map((p) => (p.sizes.length > 0 ? p.sizes.join(', ') : '—'))} />
              <Row label="Colores" values={columns.map((p) => (p.colors.length > 0 ? p.colors.join(', ') : '—'))} />
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="py-3 pr-3 text-xs font-medium uppercase tracking-wide text-coffee-500">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-3 text-coffee-700">
          {v}
        </td>
      ))}
    </tr>
  );
}
