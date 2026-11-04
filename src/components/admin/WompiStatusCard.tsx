'use client';

import { useEffect, useState } from 'react';

type Status = {
  mode: 'test' | 'production' | null;
  keys: { publicKey: boolean; privateKey: boolean; integrity: boolean; events: boolean };
  keysMatch: boolean;
  webhookUrl: string;
  lastWebhook: { at: string; ok: boolean; reference?: string; status?: string; detail: string } | null;
};

const KEY_LABELS: [keyof Status['keys'], string][] = [
  ['publicKey', 'Llave pública'],
  ['privateKey', 'Llave privada'],
  ['integrity', 'Secreto de integridad'],
  ['events', 'Secreto de eventos'],
];

export default function WompiStatusCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/wompi')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;
  const missing = KEY_LABELS.filter(([k]) => !status.keys[k]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(status.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the URL stays visible to copy by hand
    }
  };

  return (
    <section className="mt-8 max-w-xl rounded-2xl border border-cream-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-coffee-900">Pagos con Wompi</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status.mode === 'production'
              ? 'bg-green-100 text-green-800'
              : status.mode === 'test'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {status.mode === 'production' ? 'Producción' : status.mode === 'test' ? 'Modo pruebas' : 'Sin configurar'}
        </span>
      </div>
      <p className="mt-1 text-sm text-coffee-600">
        Wompi avisa a la tienda cada vez que un pago se aprueba o se rechaza (webhook). Sin ese aviso los pedidos se
        quedan en «Pendiente».
      </p>

      {status.mode === 'test' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Estás con llaves de pruebas (pub_test_…): los pagos reales no pasan por aquí. Cambia a las llaves de producción
          en Configuración.
        </p>
      )}
      {!status.keysMatch && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          La llave pública y la privada son de ambientes distintos (una de pruebas y otra de producción). Usa las dos del
          mismo ambiente.
        </p>
      )}
      {missing.length > 0 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          Falta en Configuración: {missing.map(([, l]) => l).join(', ')}.
        </p>
      )}

      {status.lastWebhook ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${
            status.lastWebhook.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {status.lastWebhook.ok ? '✓' : '✗'} Último aviso de Wompi (
          {new Date(status.lastWebhook.at).toLocaleString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {status.lastWebhook.reference ? `, ${status.lastWebhook.reference}` : ''}): {status.lastWebhook.detail}
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          ✗ La tienda todavía no ha recibido ningún aviso de Wompi. Lo más probable es que la URL de eventos no esté
          configurada en Wompi.
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-coffee-700">
        <li>
          Entra a{' '}
          <a
            href="https://comercios.wompi.co"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            comercios.wompi.co
          </a>{' '}
          › Desarrolladores, con el interruptor en <strong>Producción</strong>.
        </li>
        <li>
          En «URL de Eventos» pega esta dirección y guarda:
          <div className="mt-1.5 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-cream-100 px-3 py-2 font-mono text-xs text-coffee-900">
              {status.webhookUrl}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg border border-cream-200 px-3 py-2 text-xs font-medium text-coffee-800 transition-colors hover:bg-cream-100"
            >
              {copied ? 'Copiada ✓' : 'Copiar'}
            </button>
          </div>
        </li>
        <li>
          En esa misma página copia el <strong>Secreto de eventos</strong> y pégalo en Configuración › «Secreto de eventos
          (webhook)». Las llaves pública, privada y de integridad deben ser de producción también.
        </li>
        <li>
          Los pedidos que se quedaron en «Pendiente» se arreglan desde Pedidos con el botón «Verificar pago en Wompi».
        </li>
      </ol>
    </section>
  );
}
