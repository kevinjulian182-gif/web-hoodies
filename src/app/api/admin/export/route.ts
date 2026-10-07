import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma, prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { formatCOP } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [orders, products] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } } } }),
    prismaInternal.product.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AFRA';
  workbook.created = new Date();

  const salesSheet = workbook.addWorksheet('Ventas');
  salesSheet.columns = [
    { header: 'Referencia', key: 'ref', width: 22 },
    { header: 'Cliente', key: 'name', width: 24 },
    { header: 'Correo', key: 'email', width: 26 },
    { header: 'Ciudad', key: 'city', width: 16 },
    { header: 'Productos', key: 'items', width: 40 },
    { header: 'Subtotal', key: 'subtotal', width: 16 },
    { header: 'Descuento', key: 'discount', width: 14 },
    { header: 'Total', key: 'total', width: 16 },
    { header: 'Estado', key: 'status', width: 14 },
    { header: 'Guía', key: 'tracking', width: 18 },
    { header: 'Fecha', key: 'date', width: 18 },
  ];
  salesSheet.getRow(1).font = { bold: true };
  for (const order of orders) {
    salesSheet.addRow({
      ref: order.wompiReference,
      name: order.customerName,
      email: order.customerEmail,
      city: order.shippingCity,
      items: order.items
        .map((i) => `${i.product.name} (${i.size}${i.color ? `/${i.color}` : ''}) x${i.quantity}`)
        .join(', '),
      subtotal: formatCOP(order.subtotalCents),
      discount: formatCOP(order.discountCents),
      total: formatCOP(order.totalCents),
      status: STATUS_LABEL[order.status] ?? order.status,
      tracking: order.trackingNumber ?? '',
      date: order.createdAt.toLocaleDateString('es-CO'),
    });
  }

  // Numeric columns are raw numbers (not formatCOP strings) so this sheet
  // can be edited in Excel and re-uploaded via "Importar Excel" — Slug is
  // the match key the import uses to find each product again (names aren't
  // guaranteed unique, e.g. a duplicated product).
  const inventorySheet = workbook.addWorksheet('Inventario');
  inventorySheet.columns = [
    { header: 'Nombre', key: 'name', width: 28 },
    { header: 'Slug', key: 'slug', width: 24 },
    { header: 'Marca', key: 'brand', width: 18 },
    { header: 'Precio', key: 'price', width: 14 },
    { header: 'Precio antes de descuento', key: 'compareAtPrice', width: 22 },
    { header: 'Costo', key: 'cost', width: 14 },
    { header: 'Margen', key: 'margin', width: 12 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Tallas', key: 'sizes', width: 18 },
    { header: 'Colores', key: 'colors', width: 22 },
    { header: 'Estado', key: 'status', width: 12 },
    { header: 'Promo', key: 'promo', width: 10 },
  ];
  inventorySheet.getRow(1).font = { bold: true };
  for (const product of products) {
    inventorySheet.addRow({
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      price: product.priceCents / 100,
      compareAtPrice: product.compareAtPriceCents != null ? product.compareAtPriceCents / 100 : '',
      cost: product.costCents != null ? product.costCents / 100 : '',
      margin:
        product.costCents != null
          ? `${Math.round(((product.priceCents - product.costCents) / product.priceCents) * 100)}%`
          : '',
      stock: product.stock,
      sizes: product.sizes.join(', '),
      colors: product.colors.join(', '),
      status: product.active ? 'Activo' : 'Inactivo',
      promo: product.isPromo ? 'Sí' : 'No',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="afra-reporte-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
