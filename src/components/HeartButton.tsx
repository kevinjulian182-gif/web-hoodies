'use client';

import { useWishlist } from '@/lib/wishlist';

export default function HeartButton({
  productId,
  size = 20,
  className = '',
}: {
  productId: string;
  size?: number;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const active = has(productId);

  return (
    <button
      type="button"
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path
          d="M12 20.5s-7.5-4.7-10-9.3C.5 8 1.8 4.5 5 3.6c2.1-.6 4 .3 5 2 1-1.7 2.9-2.6 5-2 3.2.9 4.5 4.4 3 7.6-2.5 4.6-10 9.3-10 9.3Z"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
