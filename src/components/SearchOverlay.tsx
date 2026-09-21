'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';

type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  images: string[];
  priceCents: number;
};

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<SearchProduct[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && products === null) {
      fetch('/api/products')
        .then((res) => res.json())
        .then(setProducts)
        .catch(() => setProducts([]));
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, products]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const results =
    q.length > 0
      ? (products ?? []).filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 6)
      : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-coffee-900/30 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-0 z-[71] bg-cream-50 shadow-xl"
          >
            <div className="mx-auto max-w-2xl px-6 py-8">
              <div className="flex items-center gap-3 border-b border-coffee-900/20 pb-3">
                <SearchIcon />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por producto o marca…"
                  className="flex-1 bg-transparent text-lg text-coffee-900 placeholder:text-coffee-400 focus:outline-none"
                />
                <button aria-label="Cerrar búsqueda" onClick={onClose} className="text-coffee-500 hover:text-coffee-900">
                  <CloseIcon />
                </button>
              </div>

              {q.length > 0 && (
                <div className="mt-4">
                  {results.length === 0 ? (
                    <p className="py-6 text-sm text-coffee-500">No encontramos nada para &quot;{query}&quot;.</p>
                  ) : (
                    <ul className="divide-y divide-cream-200">
                      {results.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/productos/${p.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-4 py-3 group"
                          >
                            <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                              {p.images[0] && (
                                <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase tracking-wide text-coffee-500">{p.brand}</p>
                              <p className="text-sm font-medium text-coffee-900 group-hover:underline">{p.name}</p>
                            </div>
                            <p className="text-sm text-coffee-700">{formatCOP(p.priceCents)}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-coffee-600">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
