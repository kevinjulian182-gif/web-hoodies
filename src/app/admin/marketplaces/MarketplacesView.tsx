'use client';

import { useState } from 'react';
import type { MarketplaceListing } from '@/lib/marketplaces';
import { formatCOP } from '@/lib/format';

type Tab = 'mercadolibre' | 'facebook';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard blocked: the text is still selectable
        }
      }}
      className="shrink-0 rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-coffee-800 transition-colors hover:bg-cream-100 active:scale-[0.98]"
    >
      {copied ? 'Copiado ✓' : label}
    </button>
  );
}

const step = 'rounded-xl border border-cream-200 bg-white p-4';
const link = 'font-medium underline underline-offset-2';

function MercadoLibreGuide() {
  return (
    <ol className="space-y-3 text-sm text-coffee-700">
      <li className={step}>
        <p className="font-semibold text-coffee-900">1. Cuenta de vendedor</p>
        <p className="mt-1">
          Crea la cuenta en{' '}
          <a href="https://www.mercadolibre.com.co" target="_blank" rel="noreferrer" className={link}>
            mercadolibre.com.co
          </a>{' '}
          con el correo de la tienda. En «Mi perfil › Datos de facturación» pon los datos de AFRA (NIT o cédula) y valida tu
          identidad. Vincula una cuenta bancaria en Mercado Pago para recibir el dinero.
        </p>
      </li>
      <li className={step}>
        <p className="font-semibold text-coffee-900">2. Publica tus productos</p>
        <p className="mt-1">
          <strong>Pocos productos:</strong> «Vender» › Ropa y accesorios, y pega el título y la descripción de cada producto
          de la lista de abajo. Sube las fotos (enlaces JPG) y crea una variante por talla y color con su stock.
        </p>
        <p className="mt-2">
          <strong>Muchos productos:</strong> en «Publicaciones › Publicar en lote» (publicador masivo) descarga la plantilla
          de Excel de la categoría y copia las columnas del archivo de abajo (SKU, título, precio, stock, talla, color, fotos).
        </p>
        <a
          href="/api/admin/marketplaces/export"
          className="mt-3 inline-flex rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98]"
        >
          Descargar productos (CSV para Excel)
        </a>
      </li>
      <li className={step}>
        <p className="font-semibold text-coffee-900">3. Precio y envío</p>
        <p className="mt-1">
          Mercado Libre cobra una comisión por venta y, en productos de bajo valor, un cargo fijo. Revisa el valor exacto
          al publicar (te lo muestra antes de confirmar) y súbelo al precio si quieres ganar lo mismo que en la web. Activa
          Mercado Envíos para que la guía la genere Mercado Libre.
        </p>
      </li>
      <li className={step}>
        <p className="font-semibold text-coffee-900">4. Reglas que evitan que te pausen la publicación</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Nada de enlaces, teléfonos, WhatsApp ni correos en el título, la descripción o las fotos.</li>
          <li>Título de máximo 60 caracteres: producto + marca + modelo + color (ya vienen así abajo).</li>
          <li>Foto principal con fondo blanco o claro, sin logos de texto ni marcos.</li>
          <li>Ropa: completa la guía de talles con las medidas reales de cada prenda.</li>
          <li>El stock de Mercado Libre no se descuenta de la web: actualízalo cuando vendas en cualquiera de los dos.</li>
        </ul>
      </li>
    </ol>
  );
}

function FacebookGuide() {
  return (
    <ol className="space-y-3 text-sm text-coffee-700">
      <li className={step}>
        <p className="font-semibold text-coffee-900">1. Tienda en Facebook e Instagram (con tu catálogo)</p>
        <p className="mt-1">
          Tu catálogo ya está conectado a Meta con el feed de la web (Mi cuenta › Catálogo de WhatsApp). En{' '}
          <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className={link}>
            Commerce Manager
          </a>{' '}
          abre el catálogo › «Canales de venta». Si aparece <strong>Marketplace</strong>, actívalo y tus productos salen allí
          solos, con el precio y el stock de la web. Si no aparece, Meta aún no lo ofrece para empresas en Colombia: usa los
          canales que sí estén (Tienda en la Página, etiquetas de compra en Instagram, WhatsApp) y publica en Marketplace como
          en el paso 2.
        </p>
      </li>
      <li className={step}>
        <p className="font-semibold text-coffee-900">2. Publicar a mano en Marketplace</p>
        <p className="mt-1">
          Desde la app de Facebook › Marketplace › «Vender» › «Artículo». Usa el título, el precio y la descripción de la lista
          de abajo, y descarga las fotos desde los enlaces. Categoría: Ropa y calzado; estado: Nuevo. En la descripción de
          Marketplace sí puedes poner el enlace a la web para que paguen con Wompi o contra entrega.
        </p>
      </li>
      <li className={step}>
        <p className="font-semibold text-coffee-900">3. Consejos</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Publica cada color como un artículo aparte: Marketplace no maneja variantes.</li>
          <li>Renueva las publicaciones cada semana para que vuelvan a salir arriba.</li>
          <li>Responde rápido en Messenger: Marketplace muestra tu tiempo de respuesta.</li>
          <li>Marca «Agotado» o elimina la publicación cuando se acabe el stock en la web.</li>
        </ul>
      </li>
    </ol>
  );
}

export default function MarketplacesView({ listings }: { listings: MarketplaceListing[] }) {
  const [tab, setTab] = useState<Tab>('mercadolibre');

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Mercado Libre y Marketplace</h1>
      <p className="mt-1 text-sm text-coffee-600">
        Vende tus productos en otros canales con los textos y fotos listos para copiar.
      </p>

      <div className="mt-6 flex rounded-lg border border-cream-200 bg-white p-1 text-sm sm:w-fit" role="tablist">
        {(
          [
            ['mercadolibre', 'Mercado Libre'],
            ['facebook', 'Facebook Marketplace'],
          ] as [Tab, string][]
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-md px-4 py-2 transition-colors sm:flex-none ${
              tab === value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === 'mercadolibre' ? <MercadoLibreGuide /> : <FacebookGuide />}</div>

      <h2 className="mt-10 text-base font-semibold text-coffee-900">Productos listos para publicar ({listings.length})</h2>
      <div className="mt-3 space-y-3">
        {listings.length === 0 && (
          <p className="rounded-xl border border-dashed border-cream-200 p-6 text-center text-sm text-coffee-600">
            No hay productos activos con foto.
          </p>
        )}
        {listings.map((l) => {
          const stock = Object.entries(l.stockBySize);
          const total = l.stockPerSize ? stock.reduce((n, [, s]) => n + s, 0) : stock[0]?.[1] ?? 0;
          return (
            <details key={l.sku} className="group rounded-xl border border-cream-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-cream-100 object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-coffee-900">{l.title}</p>
                  <p className="text-xs text-coffee-600">
                    {formatCOP(l.pricePesos * 100)} · {total > 0 ? `${total} en stock` : 'Agotado'}
                  </p>
                </div>
                <span className="text-coffee-400 transition-transform group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="space-y-4 border-t border-cream-200 p-4 text-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-coffee-600">Título ({l.title.length}/60)</p>
                    <CopyButton text={l.title} label="Copiar título" />
                  </div>
                  <p className="mt-1 text-coffee-900">{l.title}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-coffee-600">Precio</p>
                    <CopyButton text={String(l.pricePesos)} label="Copiar precio" />
                  </div>
                  <p className="mt-1 text-coffee-900">{formatCOP(l.pricePesos * 100)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-coffee-600">Descripción</p>
                    <CopyButton
                      text={tab === 'facebook' ? `${l.description}\n\nCómpralo aquí: ${l.link}` : l.description}
                      label="Copiar descripción"
                    />
                  </div>
                  <p className="mt-1 whitespace-pre-line text-coffee-800">{l.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-coffee-600">
                    Stock por talla{!l.stockPerSize && ' (total compartido entre tallas)'}
                  </p>
                  <p className="mt-1 text-coffee-800">
                    {l.stockPerSize ? stock.map(([size, s]) => `${size}: ${s}`).join(' · ') : `${total} unidades · tallas ${stock.map(([s]) => s).join(', ')}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-coffee-600">Fotos (JPG)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {l.images.map((src, i) => (
                      <a key={src} href={src} target="_blank" rel="noreferrer" download className="block" aria-label={`Foto ${i + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-20 w-20 rounded-lg bg-cream-100 object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-coffee-500">Toca una foto para abrirla y guardarla.</p>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
