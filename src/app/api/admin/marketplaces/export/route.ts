import { NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { getMarketplaceListings } from '@/lib/marketplaces';

export const dynamic = 'force-dynamic';

const cell = (value: string | number) => {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// One row per product, color and size: the shape Mercado Libre's bulk
// upload template asks for, ready to copy column by column.
export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const listings = await getMarketplaceListings();
  const header = ['SKU', 'Título', 'Precio (COP)', 'Stock', 'Talla', 'Color', 'Marca', 'Categoría', 'Condición', 'Descripción', 'Imagen 1', 'Imagen 2', 'Imagen 3', 'Imagen 4', 'Imagen 5', 'Imagen 6'];
  const rows = listings.flatMap((l) => {
    const sizes = Object.keys(l.stockBySize);
    return (sizes.length ? sizes : ['Única']).map((size) => [
      `${l.sku}-${size}`,
      l.title,
      l.pricePesos,
      // A shared total can't be split per size; it goes on the first size only so nothing oversells.
      l.stockPerSize ? l.stockBySize[size] ?? 0 : size === sizes[0] ? l.stockBySize[size] ?? 0 : 0,
      size,
      l.color ?? '',
      l.brand,
      l.category ?? '',
      'Nuevo',
      l.description,
      ...Array.from({ length: 6 }, (_, i) => l.images[i] ?? ''),
    ]);
  });
  // BOM so Excel opens accents correctly.
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="afra-mercadolibre.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
