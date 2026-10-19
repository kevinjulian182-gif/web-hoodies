'use client';

import { useEffect, useState } from 'react';

const FEED_PATH = '/feeds/whatsapp-catalog.csv';

export default function WhatsAppCatalogCard() {
  const [feedUrl, setFeedUrl] = useState(FEED_PATH);
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFeedUrl(`${window.location.origin}${FEED_PATH}`);
    fetch(FEED_PATH)
      .then((r) => r.text())
      .then((csv) => setCount(Math.max(0, csv.trim().split('\n').length - 1)))
      .catch(() => {});
  }, []);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-coffee-900">Catálogo de WhatsApp Business</h2>
          <p className="mt-1 text-sm text-coffee-600">
            Este enlace tiene todos los productos activos de la tienda con fotos, precios y disponibilidad. Conéctalo
            una vez en Meta y el catálogo de WhatsApp se actualiza solo.
          </p>
        </div>
        {count !== null && (
          <span className="shrink-0 rounded-full bg-cream-100 px-2.5 py-1 text-xs font-medium text-coffee-700">
            {count} artículos
          </span>
        )}
      </div>

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
          Vincula tu WhatsApp Business a una cuenta comercial de Meta: en la app, ve a{' '}
          <span className="font-medium">Ajustes › Herramientas para la empresa</span> y conecta tu cuenta de Facebook o
          Meta Business.
        </li>
        <li>
          Entra al{' '}
          <a
            href="https://business.facebook.com/commerce"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Administrador de ventas (Commerce Manager)
          </a>{' '}
          y crea un catálogo de tipo «Comercio electrónico».
        </li>
        <li>
          En el catálogo ve a <span className="font-medium">Orígenes de datos › Agregar artículos › Feed de datos</span>,
          elige «Programar una URL», pega el enlace de arriba, frecuencia <span className="font-medium">cada hora</span>{' '}
          y moneda <span className="font-medium">COP</span>.
        </li>
        <li>
          Conecta ese catálogo a tu número de WhatsApp Business (en Commerce Manager o en Meta Business Suite ›
          Configuración). Luego, en la app, el catálogo aparece en{' '}
          <span className="font-medium">Herramientas para la empresa › Catálogo</span>.
        </li>
      </ol>
      <p className="mt-3 text-xs text-coffee-500">
        Cada color de un producto aparece como un artículo, con las tallas disponibles en la descripción. Los agotados
        se marcan solos como «Agotado». Meta puede tardar unas horas en revisar los productos la primera vez.
      </p>
    </section>
  );
}
