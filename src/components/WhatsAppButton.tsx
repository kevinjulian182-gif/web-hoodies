'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const MESSAGE = encodeURIComponent('Hola, tengo una pregunta sobre un producto de Paramo.');

export default function WhatsAppButton({ number }: { number: string }) {
  const pathname = usePathname();

  // On phones the button floats above the bottom tab bar (3.5rem), and on
  // product pages also above the sticky "Comprar" bar (~4.25rem) once the
  // main buy box (#comprar) scrolls out of view — so it never covers either.
  const isProductDetail = /^\/productos\/[^/]+$/.test(pathname);
  const [aboveBuyBar, setAboveBuyBar] = useState(false);

  useEffect(() => {
    setAboveBuyBar(false);
    if (!isProductDetail) return;
    const buyBox = document.getElementById('comprar');
    if (!buyBox) return;
    const observer = new IntersectionObserver(([entry]) => setAboveBuyBar(!entry.isIntersecting), {
      rootMargin: '-96px 0px 0px 0px',
    });
    observer.observe(buyBox);
    return () => observer.disconnect();
  }, [isProductDetail, pathname]);

  if (
    !number ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/voucher')
  )
    return null;

  return (
    <a
      href={`https://wa.me/${number}?text=${MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className={`fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-[transform,bottom] duration-300 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 md:h-14 md:w-14 ${
        isProductDetail && aboveBuyBar
          ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]'
      }`}
    >
      <WhatsAppIcon />
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 md:h-7 md:w-7">
      <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 5 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3Z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 14.9 3.7 13.5 3.7 12c0-4.6 3.7-8.3 8.3-8.3s8.3 3.7 8.3 8.3-3.7 8.2-8.3 8.2Z" />
    </svg>
  );
}
