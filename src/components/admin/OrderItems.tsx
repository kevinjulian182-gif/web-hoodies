'use client';

import { useState } from 'react';
import { formatCOP } from '@/lib/format';
import { parseColorImages } from '@/lib/colors';

export type OrderItemView = {
  id: string;
  quantity: number;
  size: string;
  color: string | null;
  priceCents: number;
  product: { name: string; images?: string[]; colorImages?: unknown };
};

/** What the customer bought: photo, product, size/color, units and price. */
export default function OrderItems({ items }: { items: OrderItemView[] }) {
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        // Products with photos per color keep them in colorImages, not images.
        const byColor = parseColorImages(item.product.colorImages);
        const image =
          (item.color && byColor[item.color]?.[0]) || item.product.images?.[0] || Object.values(byColor)[0]?.[0];
        return (
          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-cream-100/70 p-2">
            <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
              {image && <Thumb src={image} />}
              {item.quantity > 1 && (
                <span className="absolute right-0.5 top-0.5 rounded-full bg-coffee-900 px-1.5 text-[10px] font-semibold leading-4 text-cream-50">
                  ×{item.quantity}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-coffee-900">{item.product.name}</p>
              <p className="text-xs text-coffee-600">
                Talla <strong className="font-semibold text-coffee-900">{item.size}</strong>
                {item.color && <> · {item.color}</>} · {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
              </p>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-coffee-700">{formatCOP(item.priceCents * item.quantity)}</p>
          </li>
        );
      })}
    </ul>
  );
}

// Plain <img>, like the product list's thumbnails: the admin loads the stored
// file directly instead of going through Next's image optimizer. A photo that
// fails leaves the neutral box instead of broken-image alt text.
function Thumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}
