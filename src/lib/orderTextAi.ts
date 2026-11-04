import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import { getConfigValue } from '@/lib/config';
import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';
import type { InventoryItem, ParsedOrder } from '@/lib/orderText';

// Free-form order messages ("hola soy laura, me mandas el hoodie crema en S a
// cali…") read by Claude, matched against the live inventory. Only used when
// an Anthropic API key is saved in Configuración; otherwise lib/orderText.ts
// reads labelled messages without any API.

const OrderSchema = z.object({
  customerName: z.string().nullable(),
  shippingPhone: z.string().nullable(),
  customerDocument: z.string().nullable(),
  customerEmail: z.string().nullable(),
  shippingAddress: z.string().nullable(),
  shippingAddressComplement: z.string().nullable(),
  shippingCity: z.string().nullable(),
  shippingDepartment: z.string().nullable(),
  deliveryNotes: z.string().nullable(),
  paymentMethod: z.enum(['COD', 'TRANSFER', 'CREDIT']).nullable(),
  items: z.array(
    z.object({
      productId: z.string(),
      size: z.string().nullable(),
      color: z.string().nullable(),
      quantity: z.number().int(),
    })
  ),
});

const SYSTEM = `Extraes los datos de un pedido de una tienda de ropa colombiana a partir de un mensaje que pegó la dueña (WhatsApp, Instagram, etc.).

Reglas:
- Devuelve null en cualquier campo que el mensaje no diga. No inventes datos.
- shippingPhone: celular colombiano de 10 dígitos, sin +57 ni espacios.
- customerDocument: solo dígitos de la cédula o NIT.
- shippingAddress: la dirección principal (calle/carrera y número). Apartamento, torre, barrio o conjunto van en shippingAddressComplement.
- shippingDepartment: uno de estos nombres exactos: ${COLOMBIA_DEPARTMENTS.join(', ')}. Dedúcelo de la ciudad si es obvio (Medellín → Antioquia, Cali → Valle del Cauca, Bogotá → Bogotá D.C.).
- paymentMethod: "CREDIT" si se lo fían (lo paga después, a crédito); "COD" si pagará contra entrega, "TRANSFER" si ya pagó o pagará por transferencia, Nequi, Daviplata, etc.; null si no lo dice. "El envío lo pago al recibir" se refiere al envío, no al pago del pedido.
- items: solo productos del inventario dado, con su id exacto. size y color deben ser uno de los valores de ese producto, o null si el mensaje no lo dice. quantity es 1 si no se indica.
- deliveryNotes: indicaciones para el mensajero (portería, horario, referencias), si las hay.`;

export async function getAnthropicKey() {
  return (await getConfigValue('ANTHROPIC_API_KEY'))?.trim() || null;
}

export async function parseOrderTextWithAi(text: string, inventory: InventoryItem[]): Promise<ParsedOrder> {
  const apiKey = await getAnthropicKey();
  if (!apiKey) throw new Error('Falta la API key de Anthropic.');
  const client = new Anthropic({ apiKey });

  const catalog = inventory
    .map((p) => `${p.id} | ${p.name} | ${p.brand} | tallas: ${p.sizes.join(', ') || '-'} | colores: ${p.colors.join(', ') || '-'}`)
    .join('\n');

  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // A short extraction: low effort keeps it fast and cheap.
    output_config: { effort: 'low', format: betaZodOutputFormat(OrderSchema) },
    // If the model declines, the request is retried on another model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // The inventory list repeats on every call, so it's cached.
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: `Inventario (id | nombre | marca | tallas | colores):\n${catalog}`, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: `Mensaje del cliente:\n"""\n${text}\n"""` }],
  });

  if (response.stop_reason === 'refusal') throw new Error('La IA no pudo leer este mensaje.');
  if (!response.parsed_output) throw new Error('La IA no devolvió los datos del pedido.');
  return response.parsed_output;
}
