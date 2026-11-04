import { z } from 'zod';

/** An order typed in by hand in the Gestor (new or edited). */
export const manualOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Escribe el nombre del cliente.'),
  shippingPhone: z.string().trim().min(7, 'Escribe un celular válido.'),
  customerDocument: z.string().trim().optional(),
  customerEmail: z.union([z.string().trim().email('El correo no es válido.'), z.literal('')]).default(''),
  shippingAddress: z.string().trim().min(4, 'Escribe la dirección.'),
  shippingAddressComplement: z.string().trim().optional(),
  shippingCity: z.string().trim().min(2, 'Escribe la ciudad.'),
  shippingDepartment: z.string().trim().optional(),
  deliveryNotes: z.string().trim().optional(),
  paymentMethod: z.enum(['COD', 'TRANSFER', 'CREDIT']),
  shippingCents: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        size: z.string().min(1, 'Elige la talla.'),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        priceCents: z.number().int().min(0),
      })
    )
    .min(1, 'Agrega al menos un producto.'),
});

/** Editing also lets you set a discount (e.g. a fiado agreed for less). */
export const editOrderSchema = manualOrderSchema.extend({
  discountCents: z.number().int().min(0).default(0),
});
