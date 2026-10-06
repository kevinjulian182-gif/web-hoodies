import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

type RowError = { row: number; name: string; message: string };

// Column headers map 1:1 with the "Inventario" sheet produced by
// /api/admin/export, so the intended flow is export → edit in Excel →
// re-upload here. Each row is treated as the full, authoritative state for
// those fields (not a partial patch) — that matches how someone actually
// edits a spreadsheet: a blank Costo or Precio antes de descuento cell
// means "no cost" / "no discount", not "leave whatever was there".
// Stock is intentionally NOT imported: it's split per size+color in the
// admin product form now, and overwriting the cached total from a single
// spreadsheet cell would silently desync it from the real variant rows.
const REQUIRED_HEADERS = ['Nombre', 'Precio', 'Estado'];

function parseMoney(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseBoolFlag(raw: unknown, trueValues: string[]): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  return trueValues.includes(s);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo faltante' }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo. ¿Es un .xlsx válido?' }, { status: 400 });
  }

  const sheet = workbook.getWorksheet('Inventario');
  if (!sheet) {
    return NextResponse.json(
      { error: 'El archivo no tiene una hoja "Inventario". Usa el archivo que descargas con "Exportar Excel".' },
      { status: 400 }
    );
  }

  const headerRow = sheet.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, i) => {
    const text = String(cell.value ?? '').trim();
    if (text) colIndex[text] = i;
  });
  const missing = REQUIRED_HEADERS.filter((h) => !(h in colIndex));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Faltan columnas en la hoja: ${missing.join(', ')}.` },
      { status: 400 }
    );
  }

  const cell = (row: ExcelJS.Row, header: string) => (colIndex[header] ? row.getCell(colIndex[header]).value : undefined);

  const errors: RowError[] = [];
  const notFound: string[] = [];
  let updated = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = String(cell(row, 'Nombre') ?? '').trim();
    const slug = String(cell(row, 'Slug') ?? '').trim();
    if (!name && !slug) continue; // blank row, e.g. trailing rows past the data

    const product = slug
      ? await prismaInternal.product.findUnique({ where: { slug } })
      : await prismaInternal.product.findFirst({ where: { name } });

    if (!product) {
      notFound.push(slug || name);
      continue;
    }

    const priceCents = Math.round((parseMoney(cell(row, 'Precio')) ?? 0) * 100);
    if (priceCents <= 0) {
      errors.push({ row: r, name: product.name, message: 'Precio inválido o vacío' });
      continue;
    }

    const estadoRaw = String(cell(row, 'Estado') ?? '').trim().toLowerCase();
    if (estadoRaw !== 'activo' && estadoRaw !== 'inactivo') {
      errors.push({ row: r, name: product.name, message: 'Estado debe ser "Activo" o "Inactivo"' });
      continue;
    }

    const compareAtPrice = parseMoney(cell(row, 'Precio antes de descuento'));
    const cost = parseMoney(cell(row, 'Costo'));

    await prismaInternal.product.update({
      where: { id: product.id },
      data: {
        priceCents,
        compareAtPriceCents: compareAtPrice != null ? Math.round(compareAtPrice * 100) : null,
        costCents: cost != null ? Math.round(cost * 100) : null,
        active: estadoRaw === 'activo',
        isPromo: parseBoolFlag(cell(row, 'Promo'), ['sí', 'si', 'yes', 'true']),
      },
    });
    updated += 1;
  }

  return NextResponse.json({ updated, notFound, errors });
}
