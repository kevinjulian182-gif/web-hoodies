'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CONTENT_FIELDS, CONTENT_DEFAULTS, type ContentKey, type SiteContent } from '@/lib/content';
import MediaUploader from '@/components/admin/MediaUploader';

const SECTION_PREVIEW_PATH: Record<string, string> = {
  'Portada (Hero)': '/',
  'Sección editorial': '/',
  'Sección de confianza': '/',
  'Newsletter (inicio)': '/',
  'Sobre nosotros': '/nosotros',
  'Pie de página': '/',
};

export default function AdminContentPage() {
  const [values, setValues] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState<Partial<Record<ContentKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/admin/content')
      .then((res) => res.json())
      .then(setValues);
  }, []);

  useEffect(() => {
    if (Object.keys(dirty).length === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

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

  const handleReset = (key: ContentKey) => handleChange(key, CONTENT_DEFAULTS[key]);

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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Contenido de la web</h1>
          <p className="mt-1 text-sm text-coffee-600">
            Edita los textos de la portada, la sección editorial, la de confianza, Sobre nosotros y el pie de página.
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

      {Object.keys(dirty).length > 0 && (
        <p className="mb-4 text-xs text-amber-700">Tienes cambios sin guardar.</p>
      )}

      <div className="space-y-6">
        {sections.map(([section, fields]) => {
          const isCollapsed = collapsed[section];
          return (
            <div key={section} className="rounded-xl border border-cream-200">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }))}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-coffee-600">{section}</span>
                <span className="flex items-center gap-3">
                  {SECTION_PREVIEW_PATH[section] && (
                    <Link
                      href={SECTION_PREVIEW_PATH[section]}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-coffee-500 underline hover:text-coffee-800"
                    >
                      Ver en la web ↗
                    </Link>
                  )}
                  <span className="text-coffee-400">{isCollapsed ? '+' : '–'}</span>
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-3 border-t border-cream-200 p-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs text-coffee-600">{field.label}</label>
                        {field.type !== 'video' && values[field.key] !== CONTENT_DEFAULTS[field.key] && (
                          <button
                            type="button"
                            onClick={() => handleReset(field.key)}
                            className="text-[11px] text-coffee-400 hover:text-coffee-700"
                          >
                            Restablecer
                          </button>
                        )}
                      </div>
                      {field.type === 'video' ? (
                        <div>
                          <MediaUploader
                            label=""
                            kind="video"
                            items={values[field.key] ? [values[field.key]] : []}
                            onChange={(items) => handleChange(field.key, items[items.length - 1] ?? '')}
                          />
                          <p className="mt-1.5 text-xs text-coffee-500">
                            Opcional. Si subes un video, reemplaza el fondo animado de la portada.
                          </p>
                        </div>
                      ) : field.multiline ? (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
