'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart, type CartItem } from '@/lib/cart';
import WhatsAppOrderButton from '@/components/WhatsAppOrderButton';
import { formatCOP } from '@/lib/format';
import { useCatalogSettings } from '@/lib/catalogSettings';
import { qualifiesForFreeShipping, SHIPPING_EXTRA, SHIPPING_EXTRA_NOTE } from '@/lib/pricing';

export default function CartDrawer({ whatsappNumber }: { whatsappNumber?: string }) {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotalCents, hasSoldOut } = useCart();
  const { freeShippingThresholdCents } = useCatalogSettings();
  const freeShipping = qualifiesForFreeShipping(subtotalCents, freeShippingThresholdCents);
  const pathname = usePathname();

  // Never show the drawer over the distraction-free checkout itself.
  useEffect(() => {
    if (pathname.startsWith('/checkout') && isOpen) closeCart();
  }, [pathname, isOpen, closeCart]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  if (pathname.startsWith('/checkout')) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-coffee-900/30 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-cream-50 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cream-200 px-6 h-16 shrink-0">
              <h2 className="text-base font-semibold tracking-tightest text-coffee-900">
                Tu carrito {itemCount > 0 && `(${itemCount})`}
              </h2>
              <button
                aria-label="Cerrar carrito"
                onClick={closeCart}
                className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-700 hover:bg-cream-100 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-coffee-400">
                  <BagIcon size={28} />
                </div>
                <div>
                  <p className="font-medium text-coffee-900">Tu carrito está vacío</p>
                  <p className="mt-1 text-sm text-coffee-600">Explora la colección y encuentra tu próxima pieza.</p>
                </div>
                <Link
                  href="/productos"
                  onClick={closeCart}
                  className="mt-2 inline-block rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 hover:bg-coffee-800 transition-colors"
                >
                  Ver catálogo
                </Link>
              </div>
            ) : (
              <>
                {freeShippingThresholdCents > 0 && (
                  <FreeShippingBar
                    subtotalCents={subtotalCents}
                    thresholdCents={freeShippingThresholdCents}
                  />
                )}
                <ul className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <CartRow
                        key={`${item.productId}-${item.size}-${item.color ?? ''}`}
                        item={item}
                        onUpdateQuantity={(qty) => updateQuantity(item.productId, item.size, qty, item.color)}
                        onRemove={() => removeItem(item.productId, item.size, item.color)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="shrink-0 border-t border-cream-200 px-6 py-5">
                  <dl className="mb-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-coffee-600">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums">{formatCOP(subtotalCents)}</dd>
                    </div>
                    <div className="flex justify-between text-coffee-600">
                      <dt>Envío</dt>
                      <dd className={freeShipping ? 'font-medium text-green-700' : 'tabular-nums'}>
                        {freeShipping ? 'Gratis' : SHIPPING_EXTRA}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <dt className="font-medium text-coffee-900">Total</dt>
                      <dd className="text-lg font-semibold tabular-nums text-coffee-900">
                        {formatCOP(subtotalCents)}
                        {!freeShipping && <span className="ml-1 text-xs font-normal text-coffee-500">{SHIPPING_EXTRA}</span>}
                      </dd>
                    </div>
                  </dl>
                  {hasSoldOut ? (
                    <>
                      <p role="alert" className="mb-2.5 rounded-xl bg-red-50 px-4 py-2.5 text-center text-xs text-red-700">
                        Hay productos agotados en tu carrito. Quítalos para continuar.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="block w-full cursor-not-allowed rounded-full bg-coffee-900/40 py-4 text-center text-sm font-medium tracking-wide text-cream-50"
                      >
                        Continuar al pago
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={closeCart}
                      className="block w-full rounded-full bg-coffee-900 py-4 text-center text-sm font-medium tracking-wide text-cream-50 hover:bg-coffee-800 transition-colors"
                    >
                      Continuar al pago
                    </Link>
                  )}
                  <div className={`mt-2.5 grid gap-2.5 ${whatsappNumber ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {whatsappNumber && (
                      <WhatsAppOrderButton
                        whatsappNumber={whatsappNumber}
                        items={items}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-[#25D366]/60 py-3.5 text-center text-sm font-medium text-[#128C4B] transition-colors hover:bg-[#25D366]/10 active:scale-[0.98]"
                      >
                        <WhatsAppGlyph />
                        Pedir por WhatsApp
                      </WhatsAppOrderButton>
                    )}
                    <button
                      onClick={closeCart}
                      className="rounded-full border border-coffee-300 py-3.5 text-center text-sm font-medium text-coffee-800 transition-colors hover:border-coffee-600 hover:bg-cream-100 active:scale-[0.98]"
                    >
                      Seguir comprando
                    </button>
                  </div>
                  {!freeShipping && <p className="mt-3 text-center text-xs text-coffee-500">{SHIPPING_EXTRA_NOTE}</p>}
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FreeShippingBar({
  subtotalCents,
  thresholdCents,
}: {
  subtotalCents: number;
  thresholdCents: number;
}) {
  const unlocked = subtotalCents >= thresholdCents;
  const pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  const remainingCents = Math.max(0, thresholdCents - subtotalCents);

  return (
    <div className="shrink-0 border-b border-cream-200 px-6 py-4">
      <AnimatePresence mode="wait">
        <motion.p
          key={unlocked ? 'unlocked' : 'locked'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${
            unlocked ? 'text-green-700' : 'text-coffee-800'
          }`}
        >
          {unlocked ? (
            <>
              <CheckCircleIcon /> ¡Tu envío es gratis!
            </>
          ) : (
            <>
              <TruckIcon /> Te faltan <span className="font-semibold">{formatCOP(remainingCents)}</span> para
              envío gratis
            </>
          )}
        </motion.p>
      </AnimatePresence>
      {!unlocked && (
        <p className="mb-2 -mt-1 pl-[22px] text-xs text-coffee-500">Mientras tanto, el envío lo pagas al recibir.</p>
      )}

      <motion.div
        animate={unlocked ? { scale: [1, 1.015, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-cream-200"
      >
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className={`relative h-full overflow-hidden rounded-full ${
            unlocked
              ? 'bg-gradient-to-r from-green-600 to-green-500'
              : 'bg-gradient-to-r from-coffee-700 to-coffee-900'
          }`}
        >
          <span className="shipping-bar-shimmer absolute inset-y-0 left-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-cream-50/40 to-transparent" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <path d="M2 8h11v8H2z" strokeLinejoin="round" />
      <path d="M13 11h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const soldOut = item.maxQuantity === 0;
  const atMax = item.maxQuantity !== undefined && item.quantity >= item.maxQuantity;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 overflow-hidden py-4 first:pt-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-cream-200"
    >
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-100">
        {item.image && (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className={`object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`}
            sizes="80px"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-coffee-900">{item.name}</p>
            <p className="text-xs text-coffee-500">
              Talla {item.size}
              {item.color && ` · ${item.color}`}
            </p>
          </div>
          <button
            aria-label={`Quitar ${item.name} del carrito`}
            onClick={onRemove}
            className="shrink-0 text-coffee-400 hover:text-coffee-800 transition-colors"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        {soldOut ? (
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-coffee-900 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-cream-50">
              Agotado
            </span>
            <button onClick={onRemove} className="text-xs font-medium text-coffee-700 underline underline-offset-2">
              Quitar del carrito
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-full border border-cream-200">
                <button
                  aria-label="Reducir cantidad"
                  onClick={() => onUpdateQuantity(item.quantity - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900 active:scale-90"
                >
                  −
                </button>
                <span className="min-w-[1ch] text-sm text-coffee-900">{item.quantity}</span>
                <button
                  aria-label="Aumentar cantidad"
                  onClick={() => onUpdateQuantity(item.quantity + 1)}
                  disabled={atMax}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900 active:scale-90 disabled:cursor-not-allowed disabled:text-coffee-400/50 disabled:hover:bg-transparent disabled:active:scale-100"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-semibold text-coffee-900">
                {formatCOP(item.priceCents * item.quantity)}
              </span>
            </div>
            {atMax && (
              <p className="mt-1.5 text-[11px] text-coffee-500">
                {item.maxQuantity === 1 ? 'Es la última unidad disponible.' : `Máximo disponible: ${item.maxQuantity} unidades.`}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

function BagIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function WhatsAppGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 5 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3Z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 14.9 3.7 13.5 3.7 12c0-4.6 3.7-8.3 8.3-8.3s8.3 3.7 8.3 8.3-3.7 8.2-8.3 8.2Z" />
    </svg>
  );
}
