import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSession, requireRole } from '@/lib/auth';
import { computeAccounts } from '@/lib/accounting';
import { todayInColombia } from '@/lib/accountingConfig';

export const dynamic = 'force-dynamic';

const pesos = (cents: number) => Math.round(cents / 100);
const day = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600_000).toISOString().slice(0, 10);
const MONEY = '"$"#,##0';

/** The period's accounts as an Excel workbook (one sheet per view). */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const today = todayInColombia();
  const from = req.nextUrl.searchParams.get('from') ?? `${today.slice(0, 7)}-01`;
  const to = req.nextUrl.searchParams.get('to') ?? today;
  const a = await computeAccounts({ from, to });
  const s = a.summary;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AFRA';
  wb.created = new Date();

  const sheet = (name: string, columns: { header: string; key: string; width: number; money?: boolean }[]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
    ws.getRow(1).font = { bold: true };
    columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = MONEY;
    });
    return ws;
  };

  const summary = sheet('Resumen', [
    { header: `Cuentas ${from} a ${to}`, key: 'label', width: 36 },
    { header: 'Valor', key: 'value', width: 18, money: true },
  ]);
  summary.addRows([
    { label: 'Ventas', value: pesos(s.revenueCents) },
    { label: 'Costo de lo vendido', value: pesos(s.cogsCents) },
    { label: 'Utilidad bruta', value: pesos(s.grossProfitCents) },
    { label: 'Gastos operativos', value: pesos(s.operatingExpensesCents) },
    { label: 'Otros ingresos', value: pesos(s.otherIncomeCents) },
    { label: 'Utilidad neta', value: pesos(s.netProfitCents) },
    {},
    { label: 'Dinero que entró', value: pesos(s.cashInCents) },
    { label: 'Dinero que salió', value: pesos(s.cashOutCents) },
    { label: 'Flujo de caja', value: pesos(s.cashFlowCents) },
    { label: 'Compras de mercancía', value: pesos(s.purchasesCents) },
    {},
    { label: 'Pedidos vendidos', value: s.orders },
    { label: 'Unidades vendidas', value: s.units },
    { label: 'Ticket promedio', value: pesos(s.averageTicketCents) },
    { label: 'Por cobrar (contra entrega en curso)', value: pesos(s.receivableCents) },
    { label: 'Te deben por fiados', value: pesos(s.creditOwedCents) },
    { label: 'La tienda les debe a socios', value: pesos(s.storeOwesCents) },
    { label: 'Inventario a costo', value: pesos(a.inventory.atCost) },
    { label: 'Inventario a precio de venta', value: pesos(a.inventory.atPrice) },
  ]);
  // Counts aren't money.
  for (const row of [14, 15]) summary.getCell(`B${row}`).numFmt = '0';

  const sales = sheet('Ventas', [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Referencia', key: 'ref', width: 24 },
    { header: 'Cliente', key: 'customer', width: 24 },
    { header: 'Ciudad', key: 'city', width: 14 },
    { header: 'Canal', key: 'channel', width: 10 },
    { header: 'Pago', key: 'payment', width: 15 },
    { header: 'Productos', key: 'items', width: 44 },
    { header: 'Total', key: 'total', width: 14, money: true },
    { header: 'Costo', key: 'cost', width: 14, money: true },
    { header: 'Utilidad', key: 'profit', width: 14, money: true },
  ]);
  for (const x of a.sales) {
    sales.addRow({
      date: day(x.date),
      ref: x.reference,
      customer: x.customer,
      city: x.city,
      channel: x.channel,
      payment: x.payment,
      items: x.items.map((i) => `${i.quantity}× ${i.name} (${[i.size, i.color].filter(Boolean).join(', ')})`).join('; '),
      total: pesos(x.totalCents),
      cost: pesos(x.costCents),
      profit: pesos(x.totalCents - x.costCents),
    });
  }

  const purchases = sheet('Compras', [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Proveedor', key: 'supplier', width: 24 },
    { header: 'Factura', key: 'invoice', width: 14 },
    { header: 'Pago', key: 'method', width: 14 },
    { header: 'Pagó', key: 'paidBy', width: 16 },
    { header: 'Para la venta', key: 'order', width: 28 },
    { header: 'Artículo', key: 'item', width: 36 },
    { header: 'Cantidad', key: 'qty', width: 10 },
    { header: 'Costo unitario', key: 'unit', width: 15, money: true },
    { header: 'Subtotal', key: 'subtotal', width: 15, money: true },
  ]);
  for (const p of a.purchases) {
    for (const i of p.items) {
      purchases.addRow({
        date: day(p.date),
        supplier: p.supplier,
        invoice: p.invoiceNumber ?? '',
        method: p.paymentMethod,
        paidBy: p.paidBy || 'La tienda',
        order: p.orderLabel ?? '',
        item: [i.description, i.size, i.color].filter(Boolean).join(' · '),
        qty: i.quantity,
        unit: pesos(i.unitCostCents),
        subtotal: pesos(i.unitCostCents * i.quantity),
      });
    }
  }

  const ledger = sheet('Movimientos', [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Origen', key: 'source', width: 10 },
    { header: 'Categoría', key: 'category', width: 28 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Medio', key: 'method', width: 15 },
    { header: 'Persona', key: 'person', width: 16 },
    { header: '¿Salió de la caja?', key: 'cash', width: 16 },
    { header: 'Entrada', key: 'in', width: 14, money: true },
    { header: 'Salida', key: 'out', width: 14, money: true },
  ]);
  for (const m of [...a.movements].reverse()) {
    ledger.addRow({
      date: day(m.date),
      type: m.type === 'INCOME' ? 'Entrada' : 'Salida',
      source: m.source,
      category: m.category,
      description: m.description,
      method: m.method,
      person: m.person,
      cash: m.storeCash ? 'Sí' : 'No (lo pagó un socio)',
      in: m.type === 'INCOME' ? pesos(m.amountCents) : null,
      out: m.type === 'EXPENSE' ? pesos(m.amountCents) : null,
    });
  }

  const products = sheet('Productos vendidos', [
    { header: 'Producto', key: 'name', width: 32 },
    { header: 'Unidades', key: 'units', width: 10 },
    { header: 'Ventas', key: 'revenue', width: 15, money: true },
    { header: 'Costo', key: 'cost', width: 15, money: true },
    { header: 'Utilidad', key: 'profit', width: 15, money: true },
    { header: 'Margen', key: 'margin', width: 10 },
  ]);
  for (const p of a.topProducts) {
    products.addRow({
      name: p.name + (p.missingCost ? ' (sin costo registrado)' : ''),
      units: p.units,
      revenue: pesos(p.revenueCents),
      cost: pesos(p.costCents),
      profit: pesos(p.revenueCents - p.costCents),
      margin: p.revenueCents ? Math.round(((p.revenueCents - p.costCents) / p.revenueCents) * 100) / 100 : null,
    });
  }
  products.getColumn('margin').numFmt = '0%';

  const credits = sheet('Fiados', [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Cliente', key: 'customer', width: 24 },
    { header: 'Celular', key: 'phone', width: 14 },
    { header: 'Productos', key: 'items', width: 40 },
    { header: 'Total', key: 'total', width: 14, money: true },
    { header: 'Abonado', key: 'paid', width: 14, money: true },
    { header: 'Debe', key: 'owed', width: 14, money: true },
  ]);
  for (const c of a.credits) {
    credits.addRow({
      date: day(c.date),
      customer: c.customer,
      phone: c.phone,
      items: c.items.map((i) => `${i.quantity}× ${i.name}`).join('; '),
      total: pesos(c.totalCents),
      paid: pesos(c.paidCents),
      owed: pesos(c.balanceCents),
    });
  }

  const owes = sheet('La tienda debe', [
    { header: 'Persona', key: 'person', width: 22 },
    { header: 'Pagó de su bolsillo', key: 'paid', width: 18, money: true },
    { header: 'Le han devuelto', key: 'repaid', width: 16, money: true },
    { header: 'Se le debe', key: 'owed', width: 14, money: true },
  ]);
  for (const o of a.storeOwes) owes.addRow({ person: o.person, paid: pesos(o.paidCents), repaid: pesos(o.repaidCents), owed: pesos(o.owedCents) });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="afra-cuentas-${from}-a-${to}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
