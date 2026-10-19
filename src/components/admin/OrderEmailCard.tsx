'use client';

import { useEffect, useState } from 'react';

type Status = { configured: boolean; from: string; defaultFrom: string };

const input =
  'min-w-0 flex-1 rounded-lg border border-cream-200 px-3 py-2.5 text-sm focus:border-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-900/10';
const button =
  'shrink-0 rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800 disabled:opacity-50';

export default function OrderEmailCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [from, setFrom] = useState('');
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/admin/email')
      .then((r) => r.json())
      .then((data: Status) => {
        setStatus(data);
        setFrom(data.from);
      });

  useEffect(() => {
    load();
    fetch('/api/admin/account')
      .then((r) => r.json())
      .then((d) => d.email && setTestTo((t) => t || d.email))
      .catch(() => {});
  }, []);

  const save = async () => {
    setBusy('save');
    setMessage(null);
    const res = await fetch('/api/admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(from.trim() && from.trim() !== status?.from ? { from: from.trim() } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMessage({ ok: false, text: data.error ?? 'No se pudo guardar.' });
    setApiKey('');
    setMessage({ ok: true, text: 'Guardado. Envía un correo de prueba para confirmar que llega.' });
    load();
  };

  const sendTest = async () => {
    setBusy('test');
    setMessage(null);
    const res = await fetch('/api/admin/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testTo }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMessage(
      res.ok
        ? { ok: true, text: `Correo de prueba enviado a ${testTo}. Revisa también spam o promociones.` }
        : { ok: false, text: data.error ?? 'No se pudo enviar.' }
    );
  };

  const canSave = Boolean(apiKey.trim() || (from.trim() && from.trim() !== status?.from));

  return (
    <section className="mt-8 max-w-xl rounded-2xl border border-cream-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-coffee-900">Correo de confirmación al cliente</h2>
          <p className="mt-1 text-sm text-coffee-600">
            Cada cliente recibe un correo con su pedido, el total, la dirección de envío y qué sigue: al confirmar un
            pedido contra entrega o cuando Wompi aprueba el pago.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            status?.configured ? 'bg-green-100 text-green-800' : 'bg-cream-100 text-coffee-600'
          }`}
        >
          {status?.configured ? 'Activo' : 'Sin configurar'}
        </span>
      </div>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-coffee-700">
        <li>
          Crea una cuenta gratis en{' '}
          <a href="https://resend.com" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
            resend.com
          </a>{' '}
          (3.000 correos al mes sin costo).
        </li>
        <li>
          En <span className="font-medium">Domains</span> agrega <span className="font-mono text-xs">wearafra.com</span> y copia
          los registros DNS que te da en tu proveedor del dominio. Sin esto, los correos no salen.
        </li>
        <li>
          En <span className="font-medium">API Keys</span> crea una llave, pégala aquí y guarda.
        </li>
      </ol>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-coffee-600">API key de Resend</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status?.configured ? '•••••• (guardada, escribe para cambiarla)' : 're_…'}
            className={`${input} mt-1 w-full`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-coffee-600">Remitente (debe ser del dominio verificado)</span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder={status?.defaultFrom}
            className={`${input} mt-1 w-full`}
          />
        </label>
        <button type="button" onClick={save} disabled={!canSave || busy !== null} className={button}>
          {busy === 'save' ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="mt-5 border-t border-cream-200 pt-4">
        <p className="text-sm font-medium text-coffee-900">Enviar correo de prueba</p>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="tucorreo@gmail.com"
            className={input}
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={!status?.configured || !testTo.trim() || busy !== null}
            className={button}
          >
            {busy === 'test' ? 'Enviando…' : 'Probar'}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${
            message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
