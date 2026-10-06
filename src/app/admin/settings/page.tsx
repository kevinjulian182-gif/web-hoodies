'use client';

import { useEffect, useState } from 'react';

const LABELS: Record<string, string> = {
  WOMPI_PUBLIC_KEY: 'Wompi — Llave pública',
  WOMPI_PRIVATE_KEY: 'Wompi — Llave privada',
  WOMPI_INTEGRITY_SECRET: 'Wompi — Secreto de integridad',
  WOMPI_EVENTS_SECRET: 'Wompi — Secreto de eventos (webhook)',
  INTER_RAPIDISIMO_API_KEY: 'Inter Rapidísimo — API Key',
  RESEND_API_KEY: 'Resend — API Key (correos)',
};

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  const handleSave = async (key: string) => {
    const value = drafts[key];
    if (!value) return;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setDrafts({ ...drafts, [key]: '' });
    setConfig({ ...config, [key]: '••••••••' });
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-2">Configuración del sistema</h1>
      <p className="text-sm text-coffee-600 mb-8">
        Solo el Super Admin puede ver y actualizar las credenciales de pagos y envíos.
      </p>

      <div className="space-y-5">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key}>
            <label className="text-sm font-medium text-coffee-800">{label}</label>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                placeholder={config[key] || 'No configurado'}
                value={drafts[key] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                className="flex-1 border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleSave(key)}
                className="bg-coffee-900 text-cream-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saved === key ? 'Guardado ✓' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
