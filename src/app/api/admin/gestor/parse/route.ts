import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { checkAgainstInventory, parseOrderText } from '@/lib/orderText';
import { getAnthropicKey, parseOrderTextWithAi } from '@/lib/orderTextAi';

/** Reads a pasted customer message into order fields. Uses Claude when an
 * Anthropic API key is saved, the rule-based reader otherwise (or if the AI
 * call fails), and always checks products against the live inventory. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: 'Pega el mensaje del cliente.' }, { status: 400 });
  if (text.length > 6000) return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });

  const inventory = await prisma.product.findMany({ select: { id: true, name: true, brand: true, sizes: true, colors: true } });

  let warning: string | null = null;
  if (await getAnthropicKey()) {
    try {
      const order = await parseOrderTextWithAi(text, inventory);
      return NextResponse.json({ source: 'ai', order: checkAgainstInventory(order, inventory) });
    } catch (err) {
      warning =
        err instanceof Anthropic.AuthenticationError
          ? 'La API key de Anthropic no es válida; se usó el lector básico.'
          : err instanceof Anthropic.RateLimitError
            ? 'La IA está ocupada; se usó el lector básico.'
            : `La IA no respondió (${err instanceof Error ? err.message : 'error'}); se usó el lector básico.`;
    }
  }
  return NextResponse.json({ source: 'rules', warning, order: checkAgainstInventory(parseOrderText(text, inventory), inventory) });
}
