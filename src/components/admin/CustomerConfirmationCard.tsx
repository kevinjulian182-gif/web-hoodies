'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DeliveryLog = { ok: boolean; to: string; reference: string; at: string; error?: string };
type Status = {
  configured: boolean;
  from: string;
  defaultFrom: string;
  lastEmail: DeliveryLog | null;
  whatsappReady: boolean;
  lastWhatsApp: DeliveryLog | null;
};
type Message = { ok: boolean; text: string } | null;

const input =
  'min-w-0 flex-1 rounded-lg border border-cream-200 px-3 py-2.5 text-sm focus:border-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-900/10';
const button =
  'shrink-0 rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800 disabled:opacity-50';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function LastResult({ log, label }: { log: DeliveryLog | null; label: string }) {
  if (!log) return null;
  return (
    <p
      className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${
        log.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
      }`}
    >
      {log.ok ? '✓' : '✗'} Último {label} ({log.reference}, {formatWhen(log.at)}):{' '}
      {log.ok ? `enviado a ${log.to}` : `no se envió a ${log.to}. ${log.error}`}
    </p>
  );
}

function Notice({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      className={`mt-3 rounded-lg px-3 py-2.5 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}
    >
      {message.text}
    </p>
  );
}

export default function CustomerConfirmationCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [from, setFrom] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<Message>(null);
  const [waMessage, setWaMessage] = useState<Message>(null);

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

  const post = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error as string | undefined };
  };

  const saveEmail = async (body: object) => {
    setBusy('save');
    setEmailMessage(null);
    const res = await post('/api/admin/email', body);
    setBusy(null);
    if (!res.ok) return setEmailMessage({ ok: false, text: res.error ?? 'No se pudo guardar.' });
    setApiKey('');
    setEmailMessage({ ok: true, text: 'Guardado. Ahora envía un correo de prueba para confirmar que llega.' });
    load();
  };

  const sendTestEmail = async () => {
    setBusy('email');
    setEmailMessage(null);
    const res = await post('/api/admin/email/test', { to: testTo });
    setBusy(null);
    setEmailMessage(
      res.ok
        ? { ok: true, text: `Correo de prueba enviado a ${testTo}. Si no lo ves, revisa spam o promociones.` }
        : { ok: false, text: res.error ?? 'No se pudo enviar.' }
    );
  };

  const sendTestWhatsApp = async () => {
    setBusy('wa');
    setWaMessage(null);
    const res = await post('/api/admin/notifications/customer-test', { phone: testPhone });
    setBusy(null);
    setWaMessage(
      res.ok
        ? { ok: true, text: `Mensaje de prueba enviado a ${testPhone}.` }
        : { ok: false, text: res.error ?? 'No se pudo enviar.' }
    );
  };

  return (
    <section className="mt-8 max-w-xl rounded-2xl border border-cream-200 bg-white p-5">
      <h2 className="text-base font-semibold text-coffee-900">Confirmación al cliente</h2>
      <p className="mt-1 text-sm text-coffee-600">
        Cuando un pedido se confirma (contra entrega al crearlo, o Wompi al aprobar el pago), el cliente recibe un
        correo y un WhatsApp con su pedido.
      </p>

      {/* ── Correo ── */}
      <div className="mt-5 rounded-xl border border-cream-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-coffee-900">Correo</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              status?.configured ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {status?.configured ? 'Resend conectado' : 'Sin configurar'}
          </span>
        </div>
        <LastResult log={status?.lastEmail ?? null} label="correo" />

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-coffee-700">
          <li>
            Crea una cuenta gratis en{' '}
            <a href="https://resend.com/signup" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
              resend.com
            </a>{' '}
            (3.000 correos al mes sin costo).
          </li>
          <li>
            En{' '}
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
              Domains
            </a>{' '}
            toca «Add domain», escribe <span className="font-mono text-xs">wearafra.com</span> y elige la región más cercana
            (us-east-1).
          </li>
          <li>
            Resend te muestra unos registros (un <span className="font-mono text-xs">MX</span> y varios{' '}
            <span className="font-mono text-xs">TXT</span>, en el subdominio <span className="font-mono text-xs">send</span> y{' '}
            <span className="font-mono text-xs">resend._domainkey</span>). Cópialos tal cual en el DNS de tu dominio (donde
            compraste wearafra.com o en Vercel › Domains si el DNS está allá).
          </li>
          <li>Vuelve a Resend y toca «Verify». Cuando diga «Verified», sigue.</li>
          <li>
            En{' '}
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
              API Keys
            </a>{' '}
            crea una llave con permiso «Sending access», pégala aquí, guarda y envía una prueba.
          </li>
        </ol>
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status?.configured ? '•••• (guardada, escribe para cambiarla)' : 'API key de Resend (re_…)'}
            className={`${input} w-full`}
          />
          <label className="block">
            <span className="text-xs font-medium text-coffee-600">Remitente (del dominio verificado)</span>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={status?.defaultFrom} className={`${input} mt-1 w-full`} />
          </label>
          <button
            type="button"
            className={button}
            disabled={busy !== null || !(apiKey.trim() || (from.trim() && from.trim() !== status?.from))}
            onClick={() =>
              saveEmail({
                ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
                ...(from.trim() && from.trim() !== status?.from ? { from: from.trim() } : {}),
              })
            }
          >
            {busy === 'save' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        <div className="mt-4 border-t border-cream-200 pt-4">
          <p className="text-sm font-medium text-coffee-900">Probar correo</p>
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
              onClick={sendTestEmail}
              disabled={!status?.configured || !testTo.trim() || busy !== null}
              className={button}
            >
              {busy === 'email' ? 'Enviando…' : 'Probar'}
            </button>
          </div>
        </div>
        <Notice message={emailMessage} />
      </div>

      {/* ── WhatsApp ── */}
      <div className="mt-4 rounded-xl border border-cream-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-coffee-900">WhatsApp al cliente</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              status?.whatsappReady ? 'bg-green-100 text-green-800' : 'bg-cream-100 text-coffee-600'
            }`}
          >
            {status?.whatsappReady ? 'Automático · TextMeBot' : 'Manual'}
          </span>
        </div>
        <LastResult log={status?.lastWhatsApp ?? null} label="WhatsApp" />

        {status?.whatsappReady ? (
          <p className="mt-3 text-sm text-coffee-700">
            Cada cliente recibe la confirmación en su WhatsApp, enviada desde el WhatsApp de la tienda conectado a
            TextMeBot.
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-coffee-700">
            <p>
              Para que el mensaje le llegue <strong>solo</strong> al cliente, conecta TextMeBot arriba en «Avisos de
              pedidos nuevos» › WhatsApp. Es el único servicio económico que envía desde tu propio WhatsApp a otros
              números (CallMeBot y Telegram solo te escriben a ti).
            </p>
            <p>
              Mientras tanto, en{' '}
              <Link href="/admin/orders" className="font-medium underline underline-offset-2">
                Pedidos
              </Link>{' '}
              cada pedido tiene el botón «Enviar confirmación por WhatsApp», que abre el chat con el mensaje listo.
            </p>
          </div>
        )}

        <div className="mt-4 border-t border-cream-200 pt-4">
          <p className="text-sm font-medium text-coffee-900">Probar WhatsApp</p>
          <div className="mt-2 flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="300 123 4567"
              className={input}
            />
            <button
              type="button"
              onClick={sendTestWhatsApp}
              disabled={!status?.whatsappReady || !testPhone.trim() || busy !== null}
              className={button}
            >
              {busy === 'wa' ? 'Enviando…' : 'Probar'}
            </button>
          </div>
        </div>
        <Notice message={waMessage} />
      </div>
    </section>
  );
}
