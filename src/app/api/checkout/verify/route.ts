import { NextRequest, NextResponse } from 'next/server';
import { fetchWompiTransaction } from '@/lib/wompi';
import { applyWompiTransaction } from '@/lib/wompiPayments';

// Wompi sends the shopper back with ?id=<transaction>. Asking Wompi for that
// transaction settles the order even if the webhook never arrives. Safe to
// expose: the status comes from Wompi itself, never from the request.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const ref = req.nextUrl.searchParams.get('ref');
  if (!id || !ref) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  try {
    const transaction = await fetchWompiTransaction(id);
    if (!transaction || transaction.reference !== ref) {
      return NextResponse.json({ status: 'UNKNOWN' });
    }
    await applyWompiTransaction(transaction);
    return NextResponse.json({ status: transaction.status });
  } catch {
    return NextResponse.json({ status: 'UNKNOWN' });
  }
}
