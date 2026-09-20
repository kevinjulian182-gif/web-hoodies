'use client';

import { useEffect, useMemo, useState } from 'react';
import { CONTENT_FIELDS, CONTENT_DEFAULTS, type ContentKey, type SiteContent } from '@/lib/content';

export default function AdminContentPage() {
  const [values, setValues] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState<Partial<Record<ContentKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content')
      .then((res) => res.json())
      .then(setValues);
  }, []);

  const sections = useMemo(() => {
    const groups = new Map<string, typeof CONTENT_FIELDS>();
    for (const field of CONTENT_FIELDS) {
      if (!groups.has(field.section)) groups.set(field.section, []);
      groups.get(field.section)!.push(field);
    }
    return Array.from(groups.entries());
  }, []);

  const handleChange = (key: ContentKey, value: string) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    const res = await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dirty),
    });
    setSaving(false);
    if (res.ok) {
      setDirty({});
      setSaved(true);
    }
  };

  if (!values) return <p className="text-coffee-600">Cargando…</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Contenido de la web</h1>
          <p className="mt-1 text-sm text-coffee-600">
            Edita los textos de la portada, la sección de confianza, la página Sobre nosotros y el pie de página.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(dirty).length === 0}
          className="shrink-0 rounded-full bg-coffee-900 px-6 py-2.5 text-sm font-medium text-cream-50 disabled:opacity-40"
        >
          {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>

      <div className="space-y-10">
        {sections.map(([section, fields]) => (
          <div key={section}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-coffee-500">{section}</h2>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-coffee-600">{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      value={values[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={CONTENT_DEFAULTS[field.key]}
                      rows={2}
                      className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      value={values[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={CONTENT_DEFAULTS[field.key]}
                      className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
