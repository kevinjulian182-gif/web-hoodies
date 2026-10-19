'use client';

import { useEffect, useState } from 'react';

type Status = { configured: boolean; phone: string };

export default function WhatsAppAlertsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/admin/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage({ ok: false, text: 'No se pudo guardar la API key.' });
      return;
    }
    setApiKey('');
    setMessage({ ok: true, text: 'API key guardada. Envía una prueba para confirmar.' });
    load();
  };

  const test = async () => {
    setTesting(true);
    setMessage(null);
    const res = await fetch('/api/admin/notifications/test', { method: 'POST' });
    const data = await res.json().catch(() => null);
    setTesting(false);
    setMessage(
      res.ok
        ? { ok: true, text: 'Mensaje de prueba enviado. Revisa tu WhatsApp (puede tardar unos segundos).' }
        : { ok: false, text: data?.error ? `No se envió: ${data.error}` : 'No se pudo enviar la prueba.' }
    );
  };

  const phoneLabel = status?.phone ? `+${status.phone}` : null;

  return (
    <section className="mt-12 max-w-xl rounded-2xl border border-cream-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-coffee-900">Avisos de pedidos por WhatsApp</h2>
          <p className="mt-1 text-sm text-coffee-600">
            Cada pedido confirmado (contra entrega o pagado con Wompi) te llega como mensaje al WhatsApp de la tienda.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            status?.configured && phoneLabel ? 'bg-green-100 text-green-800' : 'bg-cream-100 text-coffee-600'
          }`}
        >
          {status?.configured && phoneLabel ? 'Activo' : 'Sin configurar'}
        </span>
      </div>

      <p className="mt-4 text-sm text-coffee-800">
        Número que recibe los avisos:{' '}
        {phoneLabel ? (
          <span className="font-medium">{phoneLabel}</span>
        ) : (
          <span className="text-red-700">ninguno — agrégalo en Contenido web › WhatsApp</span>
        )}
      </p>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-coffee-700">
        <li>
          Desde ese WhatsApp, abre{' '}
          <a
            href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            la página de CallMeBot
          </a>{' '}
          y guarda el número de WhatsApp que indican ahí.
        </li>
        <li>
          Envíale el mensaje: <span className="rounded bg-cream-100 px-1.5 py-0.5 font-mono text-xs">I allow callmebot to send me messages</span>
        </li>
        <li>Te responde con tu API key. Pégala aquí y guarda.</li>
      </ol>

      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={status?.configured ? '•••••• (ya configurada — escribe para cambiarla)' : 'API key de CallMeBot'}
          className="min-w-0 flex-1 rounded-lg border border-cream-200 px-3 py-2.5 text-sm focus:border-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-900/10"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !apiKey.trim()}
          className="rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <button
        type="button"
        onClick={test}
        disabled={testing || !status?.configured || !phoneLabel}
        className="mt-3 rounded-lg border border-cream-300 px-4 py-2 text-sm text-coffee-800 transition-colors hover:border-coffee-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {testing ? 'Enviando…' : 'Enviar mensaje de prueba'}
      </button>

      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-green-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
