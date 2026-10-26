import { NextRequest, NextResponse } from 'next/server';
import { verifyWompiWebhook, type WompiEvent } from '@/lib/wompi';
import { applyWompiTransaction, logWompiWebhook } from '@/lib/wompiPayments';

export async function POST(req: NextRequest) {
  const event = (await req.json().catch(() => null)) as WompiEvent | null;
  const transaction = event?.data?.transaction;

  if (!event || !(await verifyWompiWebhook(event))) {
    // Only signed-looking events are worth showing; random junk posts aren't Wompi.
    if (event?.signature?.checksum) await logWompiWebhook({
      ok: false,
      reference: transaction?.reference,
      status: transaction?.status,
      detail:
        'Firma inválida: el «Secreto de eventos» guardado no coincide con el de Wompi (o es de otro ambiente: pruebas vs producción).',
    });
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  // Only transaction events change orders; anything else is acknowledged.
  if (event.event !== 'transaction.updated' || !transaction) {
    await logWompiWebhook({ ok: true, detail: `Evento ${event.event} recibido (no requiere acción).` });
    return NextResponse.json({ ok: true });
  }

  const result = await applyWompiTransaction(transaction);
  await logWompiWebhook({
    ok: result.found,
    reference: transaction.reference,
    status: transaction.status,
    detail: result.found
      ? `Pedido ${result.changed ? 'actualizado' : 'sin cambios'} (${result.status}).`
      : 'No hay un pedido con esa referencia en la tienda.',
  });
  if (!result.found) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
