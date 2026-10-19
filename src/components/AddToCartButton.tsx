'use client';

import { useEffect, useRef, useState } from 'react';
import { catalogItemId, pesos, trackPixel } from '@/lib/metaPixel';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { colorToHex, parseColorImages, parseColorHex } from '@/lib/colors';
import { useProductColor } from '@/lib/productColor';
import { variantKey, COMMON_SIZES, type VariantStock } from '@/lib/variants';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppOrderButton from '@/components/WhatsAppOrderButton';
import { WhatsAppGlyph } from '@/components/CartDrawer';
import { resolveSizeGuide, type SizeChart } from '@/lib/sizeChart';
import SizeGuide from '@/components/SizeGuide';
import type { Product } from '@prisma/client';

const LOW_STOCK_THRESHOLD = 5;

type PublicProduct = Omit<Product, 'costCents'> & { variants: VariantStock[] };

export default function AddToCartButton({
  product,
  whatsappNumber,
  fallbackSizeChart,
}: {
  product: PublicProduct;
  whatsappNumber?: string;
  fallbackSizeChart?: SizeChart | null;
}) {
  const { addItem, items } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? '');
  // Shared with ProductGallery (both live under the page's
  // ProductColorProvider) so picking a color here swaps the photos too.
  const { selectedColor: color, setSelectedColor: setColor } = useProductColor();
  const [added, setAdded] = useState(false);

  // Meta Pixel: the shopper is looking at this product (and color). Waits
  // for the color to settle and sends each product+color once.
  const lastViewed = useRef('');
  useEffect(() => {
    if (product.colors.length > 0 && !color) return;
    const id = catalogItemId(product.id, color || null);
    if (lastViewed.current === id) return;
    lastViewed.current = id;
    trackPixel('ViewContent', {
      content_type: 'product',
      content_ids: [id],
      content_name: `${product.brand} ${product.name}`,
      value: pesos(product.priceCents),
      currency: 'COP',
    });
  }, [product.id, product.colors.length, product.brand, product.name, product.priceCents, color]);

  // Stock belongs to the specific size+color combo, not the product as a
  // whole — Black/M can be sold out while White/M still has plenty. A
  // product with no variant rows yet (saved before per-variant stock
  // existed) falls back to the old product-wide total so it keeps selling
  // normally until someone edits it in the new admin stock matrix.
  const colorImages = parseColorImages(product.colorImages);
  // The product's own chart wins; otherwise the store-wide guide from
  // Admin > Contenido > Guía de tallas, then a generic one for the garment
  // type — so every product with sizes has a guide.
  const sizeGuide = resolveSizeGuide(product, fallbackSizeChart ?? null);
  const colorHex = parseColorHex(product.colorHex);
  const selectedVariant = product.variants.find((v) => variantKey(v.size, v.color) === variantKey(size, color || null));
  const availableStock = product.variants.length > 0 ? selectedVariant?.stock ?? 0 : product.stock;
  const outOfStock = availableStock <= 0;
  const productSoldOut =
    product.variants.length > 0 ? product.variants.every((v) => v.stock <= 0) : product.stock <= 0;
  const lowStock = !outOfStock && availableStock <= LOW_STOCK_THRESHOLD;
  // Units of this exact size+color already in the cart; the cart's own
  // stock reading (refreshed from the server) is fresher than the page's.
  const cartLine = items.find(
    (i) => i.productId === product.id && i.size === size && (i.color ?? '') === (color || '')
  );
  const inCart = cartLine?.quantity ?? 0;
  const stockNow = cartLine?.maxQuantity ?? availableStock;
  const allInCart = !outOfStock && inCart > 0 && inCart >= stockNow;
  const [pending, setPending] = useState(false);

  // Show the full size scale, not just what this product carries, so
  // shoppers see "L is a thing, just not in this one" instead of wondering
  // whether the scale even goes that high — grayed-out sizes are a real
  // answer, a missing row is ambiguous. Any size the admin added outside
  // the canonical scale (e.g. "Única") still gets appended, enabled.
  const sizesToShow = [...COMMON_SIZES, ...product.sizes.filter((s) => !COMMON_SIZES.includes(s))];

  const handleAdd = async () => {
    if (outOfStock || allInCart || pending) return;
    const colorImage = colorImages[color]?.[0];
    setPending(true);
    const result = await addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: colorImage ?? product.images[0] ?? '',
      size,
      color: color || undefined,
      priceCents: product.priceCents,
      quantity: 1,
      maxQuantity: availableStock,
    });
    setPending(false);
    if (!result.ok) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div>
      {productSoldOut && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-cream-300 bg-cream-100/70 p-4">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-coffee-900">Agotado por ahora</p>
            <p className="mt-1 text-sm text-coffee-600">
              Se vendieron todas las unidades.{whatsappNumber ? ' Escríbenos y te avisamos si vuelve.' : ''}
            </p>
          </div>
        </div>
      )}

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

      {/* The size guide is always reachable, even on a product with no
          size options (one-size items get the reference chart). */}
      {product.sizes.length === 0 && (
        <div className="mb-6 flex justify-end">
          <SizeGuide guide={sizeGuide} selectedSize={size} onSelectSize={setSize} />
        </div>
      )}

      {product.sizes.length > 0 && (
      <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-coffee-500">Talla</span>
        <SizeGuide guide={sizeGuide} selectedSize={size} onSelectSize={setSize} />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {sizesToShow.map((s) => {
          const isAvailable = product.sizes.includes(s);
          if (!isAvailable) {
            return (
              <span
                key={s}
                aria-disabled="true"
                title="No disponible en esta talla"
                className="relative flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-dashed border-cream-300 bg-cream-100/80 text-sm font-medium text-coffee-300"
              >
                {s}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full text-coffee-400"
                  style={{
                    background:
                      'linear-gradient(to top right, transparent calc(50% - 1px), currentColor calc(50% - 1px), currentColor calc(50% + 1px), transparent calc(50% + 1px))',
                  }}
                />
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

      {allInCart && (
        <p className="mb-3 text-sm text-coffee-700">
          {stockNow === 1
            ? 'Ya tienes en tu carrito la última unidad de esta talla.'
            : `Ya tienes en tu carrito las ${stockNow} unidades disponibles de esta talla.`}
        </p>
      )}

      <motion.button
        onClick={handleAdd}
        disabled={outOfStock || allInCart || pending}
        whileTap={outOfStock || allInCart ? undefined : { scale: 0.96 }}
        className={`relative w-full overflow-hidden rounded-full py-5 text-base font-semibold tracking-[0.04em] shadow-[0_10px_30px_rgba(54,37,25,0.25)] transition-colors transition-opacity ${
          outOfStock || allInCart
            ? 'cursor-not-allowed bg-coffee-400/60 text-cream-50 shadow-none'
            : 'bg-coffee-900 text-cream-50 hover:bg-coffee-800'
        }`}
      >
        <AnimatePresence mode="wait">
          {outOfStock ? (
            <motion.span key="oos" className="block">
              Agotado
            </motion.span>
          ) : allInCart ? (
            <motion.span key="max" className="block">
              Sin más unidades disponibles
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

      {whatsappNumber &&
        (outOfStock ? (
          <a
            href={buildWhatsAppLink(
              whatsappNumber,
              `Hola, quiero preguntar por disponibilidad de "${product.name}" (talla ${size}${color ? `, color ${color}` : ''}), la veo agotada en la web.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-coffee-300 py-3.5 text-sm font-medium text-coffee-800 transition-colors hover:border-coffee-600 hover:bg-cream-100"
          >
            {productSoldOut ? 'Avísame por WhatsApp cuando vuelva' : 'Agotado en esta talla · Pregúntanos por WhatsApp'}
          </a>
        ) : (
          <>
            <WhatsAppOrderButton
              whatsappNumber={whatsappNumber}
              items={[{ productId: product.id, name: product.name, size, color: color || undefined, quantity: 1, priceCents: product.priceCents }]}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366]/60 py-3.5 text-sm font-medium text-[#128C4B] transition-colors hover:bg-[#25D366]/10 active:scale-[0.98]"
            >
              <WhatsAppGlyph />
              Pedir por WhatsApp
            </WhatsAppOrderButton>
            <a
              href={buildWhatsAppLink(
                whatsappNumber,
                `Hola, tengo una duda sobre "${product.name}" (talla ${size}${color ? `, color ${color}` : ''}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-xs text-coffee-500 underline decoration-coffee-300 underline-offset-4 transition-colors hover:text-coffee-900"
            >
              ¿Tienes dudas? Escríbenos
            </a>
          </>
        ))}
    </div>
  );
}
