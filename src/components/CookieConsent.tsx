'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  LEGAL_VERSION,
  readCookieConsent,
  type CookieChoice,
} from '@/lib/legal';
import { OPEN_COOKIE_SETTINGS } from '@/components/CookieSettingsButton';

type Fbq = (...args: unknown[]) => void;

// Asks once (and again after 12 months or from "Configurar cookies").
// Necessary storage always works; analytics and the Meta pixel only after
// "Aceptar todas". The choice is also logged server-side as proof.
export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readCookieConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  const choose = (choice: CookieChoice) => {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ choice, at: new Date().toISOString(), version: LEGAL_VERSION })
      );
    } catch {
      // storage blocked: the banner will simply ask again next visit
    }
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    // Granting releases the PageView Meta held while consent was pending,
    // so no extra PageView is sent here (it would count the visit twice).
    if (fbq) fbq('consent', choice === 'all' ? 'grant' : 'revoke');
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }));
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookies: choice }),
      keepalive: true,
    }).catch(() => {});
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Uso de cookies"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-[60] mx-auto max-w-lg rounded-2xl border border-cream-200 bg-cream-50/95 p-4 shadow-[0_18px_48px_-18px_rgba(41,28,19,0.45)] backdrop-blur-md sm:p-5 md:bottom-6 md:left-6 md:right-auto md:mx-0"
        >
          <p className="text-sm font-semibold text-coffee-900">¿Aceptas cookies?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-coffee-600">
            Usamos cookies necesarias para que la tienda funcione. Con tu permiso también usamos cookies de analítica y
            del píxel de Meta para mejorar la tienda y medir anuncios.{' '}
            <Link href="/cookies" className="font-medium text-coffee-900 underline underline-offset-2">
              Ver política de cookies
            </Link>
          </p>
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => choose('necessary')}
              className="flex-1 rounded-full border border-cream-300 px-4 py-2.5 text-sm font-medium text-coffee-800 transition-colors hover:border-coffee-700 active:scale-[0.98]"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={() => choose('all')}
              className="flex-1 rounded-full bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800 active:scale-[0.98]"
            >
              Aceptar todas
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
