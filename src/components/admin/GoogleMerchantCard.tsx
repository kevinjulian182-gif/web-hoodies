'use client';

import { useEffect, useState } from 'react';

const FEED_PATH = '/feeds/google-merchant.xml';

export default function GoogleMerchantCard() {
  const [feedUrl, setFeedUrl] = useState(FEED_PATH);
  const [copied, setCopied] = useState(false);

  useEffect(() => setFeedUrl(`${window.location.origin.replace('//admin.', '//')}${FEED_PATH}`), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the field is selectable
    }
  };

  return (
    <section className="mt-8 max-w-xl rounded-2xl border border-cream-200 bg-white p-5">
      <h2 className="text-base font-semibold text-coffee-900">Google Shopping (Merchant Center)</h2>
      <p className="mt-1 text-sm text-coffee-600">
        Con este feed tus productos aparecen gratis en la pestaña Shopping de Google y puedes hacer anuncios de Shopping
        o Performance Max. Se actualiza solo con precios, fotos y agotados.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          readOnly
          value={feedUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-cream-200 bg-cream-50 px-3 py-2.5 font-mono text-xs text-coffee-800"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-coffee-700">
        <li>
          Crea tu cuenta en{' '}
          <a href="https://merchants.google.com" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
            Google Merchant Center
          </a>{' '}
          con país Colombia y moneda COP, y verifica wearafra.com (la forma más fácil es con Google Search Console).
        </li>
        <li>
          En <span className="font-medium">Productos › Agregar productos › Agregar productos desde un archivo</span>, elige
          «Agregar un vínculo a un archivo», pega el enlace y programa la descarga diaria.
        </li>
        <li>Configura el envío (las tarifas de Interrapidísimo) y la política de devoluciones (enlaza wearafra.com/reembolsos).</li>
        <li>Para anuncios, vincula Merchant Center con tu cuenta de Google Ads.</li>
      </ol>
      <p className="mt-3 text-xs text-coffee-500">
        También envía el sitemap (wearafra.com/sitemap.xml) en Google Search Console para que Google indexe todas las
        páginas más rápido.
      </p>
    </section>
  );
}
