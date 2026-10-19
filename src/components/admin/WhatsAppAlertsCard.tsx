'use client';

import { useEffect, useState } from 'react';

type Provider = 'textmebot' | 'callmebot';
type Status = { provider: Provider | null; phone: string };

const PROVIDERS: Record<
  Provider,
  { name: string; tag: string; steps: React.ReactNode[]; url: string }
> = {
  textmebot: {
    name: 'TextMeBot',
    tag: 'Recomendado · pago (bajo costo)',
    url: 'https://textmebot.com',
    steps: [
      <>Crea una cuenta en textmebot.com y elige el plan para enviarte mensajes a ti mismo.</>,
      <>Vincula el WhatsApp de la tienda escaneando el código QR (como WhatsApp Web).</>,
      <>Copia tu API key, pégala aquí y guarda.</>,
    ],
  },
  callmebot: {
    name: 'CallMeBot',
    tag: 'Gratis · a veces está lleno o bloqueado',
    url: 'https://www.callmebot.com/blog/free-api-whatsapp-messages/',
    steps: [
      <>Desde el WhatsApp de la tienda, abre la página de CallMeBot y guarda el número que indican.</>,
      <>
        Envíale: <span className="rounded bg-cream-100 px-1.5 py-0.5 font-mono text-xs">I allow callmebot to send me messages</span>
      </>,
      <>Si responde con tu API key, pégala aquí. Si dice que está lleno, usa TextMeBot.</>,
    ],
  },
};

export default function WhatsAppAlertsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [provider, setProvider] = useState<Provider>('textmebot');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/admin/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Status | null) => {
        setStatus(s);
        if (s?.provider) setProvider(s.provider);
      })
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
      body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
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
  const active = Boolean(status?.provider && phoneLabel);
  const info = PROVIDERS[provider];

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
            active ? 'bg-green-100 text-green-800' : 'bg-cream-100 text-coffee-600'
          }`}
        >
          {active ? `Activo · ${PROVIDERS[status!.provider!].name}` : 'Sin configurar'}
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

      <div role="radiogroup" aria-label="Servicio de envío" className="mt-4 grid grid-cols-2 gap-2">
        {(Object.keys(PROVIDERS) as Provider[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={provider === key}
            onClick={() => setProvider(key)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              provider === key ? 'border-coffee-900 bg-cream-50' : 'border-cream-200 hover:border-coffee-400'
            }`}
          >
            <span className="block text-sm font-medium text-coffee-900">{PROVIDERS[key].name}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-coffee-500">{PROVIDERS[key].tag}</span>
          </button>
        ))}
      </div>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-coffee-700">
        {info.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <a href={info.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-coffee-800 underline underline-offset-2">
        Abrir {info.name} ↗
      </a>

      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            status?.provider === provider ? '•••••• (ya configurada — escribe para cambiarla)' : `API key de ${info.name}`
          }
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
        disabled={testing || !active}
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
