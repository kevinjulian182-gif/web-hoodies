import Image from 'next/image';
import { formatCOP } from '@/lib/format';

export type OrderItemView = {
  id: string;
  quantity: number;
  size: string;
  color: string | null;
  priceCents: number;
  product: { name: string; images?: string[] };
};

/** What the customer bought: photo, product, size/color, units and price. */
export default function OrderItems({ items }: { items: OrderItemView[] }) {
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const image = item.product.images?.[0];
        return (
          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-cream-100/70 p-2">
            <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-200">
              {image && <Image src={image} alt={item.product.name} fill sizes="48px" className="object-cover" />}
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
