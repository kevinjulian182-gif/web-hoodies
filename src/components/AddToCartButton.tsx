'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { colorToHex, parseColorImages, parseColorHex } from '@/lib/colors';
import { useProductColor } from '@/lib/productColor';
import { variantKey, COMMON_SIZES, type VariantStock } from '@/lib/variants';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import type { Product } from '@prisma/client';

const LOW_STOCK_THRESHOLD = 5;

type PublicProduct = Omit<Product, 'costCents'> & { variants: VariantStock[] };

export default function AddToCartButton({
  product,
  whatsappNumber,
}: {
  product: PublicProduct;
  whatsappNumber?: string;
}) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? '');
  // Shared with ProductGallery (both live under the page's
  // ProductColorProvider) so picking a color here swaps the photos too.
  const { selectedColor: color, setSelectedColor: setColor } = useProductColor();
  const [added, setAdded] = useState(false);

  // Stock belongs to the specific size+color combo, not the product as a
  // whole — Black/M can be sold out while White/M still has plenty. A
  // product with no variant rows yet (saved before per-variant stock
  // existed) falls back to the old product-wide total so it keeps selling
  // normally until someone edits it in the new admin stock matrix.
  const colorImages = parseColorImages(product.colorImages);
  const colorHex = parseColorHex(product.colorHex);
  const selectedVariant = product.variants.find((v) => variantKey(v.size, v.color) === variantKey(size, color || null));
  const availableStock = product.variants.length > 0 ? selectedVariant?.stock ?? 0 : product.stock;
  const outOfStock = availableStock <= 0;
  const lowStock = !outOfStock && availableStock <= LOW_STOCK_THRESHOLD;

  // Show the full size scale, not just what this product carries, so
  // shoppers see "L is a thing, just not in this one" instead of wondering
  // whether the scale even goes that high — grayed-out sizes are a real
  // answer, a missing row is ambiguous. Any size the admin added outside
  // the canonical scale (e.g. "Única") still gets appended, enabled.
  const sizesToShow = [...COMMON_SIZES, ...product.sizes.filter((s) => !COMMON_SIZES.includes(s))];

  const handleAdd = () => {
    if (outOfStock) return;
    const colorImage = colorImages[color]?.[0];
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: colorImage ?? product.images[0] ?? '',
      size,
      color: color || undefined,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div>
      {product.colors.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-coffee-500">
            Color{color && `: ${color}`}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((c) => {
              const thumb = colorImages[c]?.[0];
              return (
                <button
                  key={c}
                  aria-label={c}
                  title={c}
                  onClick={() => setColor(c)}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border bg-cream-50 transition-colors ${
                    color === c ? 'border-coffee-900' : 'border-cream-200 hover:border-coffee-400'
                  }`}
                >
                  {thumb ? (
                    <Image src={thumb} alt={c} fill className="object-cover" sizes="56px" />
                  ) : (
                    <span className="block h-full w-full" style={{ backgroundColor: colorToHex(c, colorHex) }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {product.sizes.length > 0 && (
      <>
      <div className="mb-2 text-xs uppercase tracking-wide text-coffee-500">Talla</div>
      <div className="flex flex-wrap gap-2 mb-6">
        {sizesToShow.map((s) => {
          const isAvailable = product.sizes.includes(s);
          if (!isAvailable) {
            return (
              <span
                key={s}
                aria-disabled="true"
                title="No disponible en esta talla"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cream-200 text-sm font-medium text-coffee-300 line-through"
              >
                {s}
              </span>
            );
          }
          return (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`h-11 w-11 rounded-full text-sm font-medium border transition-colors ${
                size === s
                  ? 'bg-coffee-900 text-cream-50 border-coffee-900'
                  : 'border-cream-200 text-coffee-700 hover:border-coffee-600'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      </>
      )}

      {lowStock && (
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-red-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          ¡Solo quedan {availableStock} unidades!
        </p>
      )}

      <motion.button
        onClick={handleAdd}
        disabled={outOfStock}
        whileTap={outOfStock ? undefined : { scale: 0.96 }}
        className={`relative w-full overflow-hidden rounded-full py-5 text-base font-semibold tracking-[0.04em] shadow-[0_10px_30px_rgba(54,37,25,0.25)] transition-colors transition-opacity ${
          outOfStock
            ? 'cursor-not-allowed bg-coffee-300 text-coffee-50 shadow-none'
            : 'bg-coffee-900 text-cream-50 hover:bg-coffee-800'
        }`}
      >
        <AnimatePresence mode="wait">
          {outOfStock ? (
            <motion.span key="oos" className="block">
              Agotado
            </motion.span>
          ) : added ? (
            <motion.span
              key="added"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              Agregado ✓
            </motion.span>
          ) : (
            <motion.span
              key="add"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              Agregar al carrito
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {whatsappNumber && (
        <a
          href={buildWhatsAppLink(
            whatsappNumber,
            outOfStock
              ? `Hola, quiero preguntar por disponibilidad de "${product.name}" (talla ${size}${color ? `, color ${color}` : ''}), la veo agotada en la web.`
              : `Hola, tengo una duda sobre "${product.name}" (talla ${size}${color ? `, color ${color}` : ''}).`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-coffee-300 py-3.5 text-sm font-medium text-coffee-800 transition-colors hover:border-coffee-600 hover:bg-cream-100"
        >
          ¿Sin stock o tienes dudas? Escríbenos
        </a>
      )}
    </div>
  );
}
