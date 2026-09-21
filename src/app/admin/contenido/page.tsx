'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CONTENT_FIELDS, CONTENT_DEFAULTS, type ContentKey, type SiteContent } from '@/lib/content';
import MediaUploader from '@/components/admin/MediaUploader';
import SectionManager from '@/components/admin/SectionManager';
import RepeatableListEditor from '@/components/admin/RepeatableListEditor';

const SECTION_PREVIEW_PATH: Record<string, string> = {
  'Colores': '/',
  'General del sitio': '/',
  'Portada (Hero)': '/',
  'Sección editorial': '/',
  'Sección de confianza': '/',
  'Catálogo': '/productos',
  'Cómo trabajamos': '/',
  'Envíos seguros': '/',
  'Materiales y calidad': '/',
  'Preguntas frecuentes': '/',
  'CTA final': '/',
  'Newsletter (inicio)': '/',
  'Sobre nosotros': '/nosotros',
  'Pie de página': '/',
};

const SECTION_HINTS: Record<string, string> = {
  'Colores': 'El resto de la paleta (botones, textos, fondos) se genera automáticamente a partir de estos dos colores.',
  'General del sitio': 'Título de pestaña, descripción para buscadores y favicon.',
  'Portada (Hero)': 'Lo primero que ve un visitante. Usa un video O un carrusel de imágenes de fondo, no ambos.',
  'Sección editorial': 'El bloque de storytelling debajo de la portada.',
  'Sección de confianza': 'Los tres argumentos de venta que aparecen en el inicio y en Sobre nosotros.',
  'Catálogo': 'Controla qué se muestra en las tarjetas de producto (inicio, catálogo, promos, favoritos).',
  'Cómo trabajamos': 'Los 4 pasos del proceso de compra, en el inicio.',
  'Envíos seguros': 'Argumentos de confianza sobre el envío, en el inicio.',
  'Materiales y calidad': 'Argumentos sobre la calidad de las prendas y la importación, en el inicio.',
  'Preguntas frecuentes': 'Se muestran en el inicio y en cada ficha de producto.',
  'CTA final': 'El llamado a la acción antes del pie de página.',
  'Newsletter (inicio)': 'El bloque de suscripción al final del inicio.',
  'Sobre nosotros': 'Textos de la página /nosotros.',
  'Pie de página': 'La descripción de la marca, redes sociales y año del copyright en el pie de todas las páginas.',
};

const STRUCTURE_TAB = 'Estructura del inicio';
const BRANDS_TAB = 'Compra por marca';

function parseImageList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export default function AdminContentPage() {
  const [values, setValues] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState<Partial<Record<ContentKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(STRUCTURE_TAB);

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

  const dirtySections = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(dirty)) {
      const field = CONTENT_FIELDS.find((f) => f.key === key);
      if (field) set.add(field.section);
    }
    if (dirty['faq.items']) set.add('Preguntas frecuentes');
    return set;
  }, [dirty]);

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

  const dirtyCount = Object.keys(dirty).length;
  const activeFields = sections.find(([section]) => section === activeTab)?.[1] ?? [];

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-8 mb-6 flex items-center justify-between gap-4 border-b border-cream-200 bg-cream-50 px-8 py-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Contenido de la web</h1>
          {dirtyCount > 0 && (
            <p className="mt-0.5 text-xs text-amber-700">
              {dirtyCount} {dirtyCount === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
          className="shrink-0 rounded-full bg-coffee-900 px-6 py-2.5 text-sm font-medium text-cream-50 transition-opacity disabled:opacity-40"
        >
          {saving ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <nav className="flex shrink-0 gap-1.5 overflow-x-auto pb-2 md:w-56 md:flex-col md:overflow-visible md:pb-0">
          <TabButton
            label={STRUCTURE_TAB}
            active={activeTab === STRUCTURE_TAB}
            dirty={false}
            onClick={() => setActiveTab(STRUCTURE_TAB)}
          />
          <TabButton
            label={BRANDS_TAB}
            active={activeTab === BRANDS_TAB}
            dirty={Boolean(dirty['brands.items'])}
            onClick={() => setActiveTab(BRANDS_TAB)}
          />
          {sections.map(([section]) => (
            <TabButton
              key={section}
              label={section}
              active={activeTab === section}
              dirty={dirtySections.has(section)}
              onClick={() => setActiveTab(section)}
            />
          ))}
        </nav>

        <div className="min-w-0 max-w-2xl flex-1">
          {activeTab === STRUCTURE_TAB ? (
            <div>
              <SectionHeader title={STRUCTURE_TAB} hint="Muestra, oculta y reordena las secciones de la página de inicio." previewPath="/" />
              <SectionManager
                value={values['home.sections']}
                onChange={(json) => handleChange('home.sections', json)}
              />
            </div>
          ) : activeTab === BRANDS_TAB ? (
            <div>
              <SectionHeader
                title={BRANDS_TAB}
                hint="Las marcas que aparecen en la sección 'Compra por marca' del inicio, con su logo."
                previewPath="/"
              />
              <RepeatableListEditor
                value={values['brands.items']}
                onChange={(json) => handleChange('brands.items', json)}
                fields={[
                  { key: 'name', label: 'Nombre de la marca' },
                  { key: 'logoUrl', label: 'Logo', type: 'image' },
                ]}
                emptyItem={{ name: '', logoUrl: '' }}
                addLabel="Agregar marca"
              />
            </div>
          ) : (
            <div>
              <SectionHeader
                title={activeTab}
                hint={SECTION_HINTS[activeTab]}
                previewPath={SECTION_PREVIEW_PATH[activeTab]}
              />
              <div className="space-y-5">
                {activeFields.map((field) => (
                  <div key={field.key}>
                    {field.type !== 'boolean' && (
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-xs font-medium text-coffee-600">{field.label}</label>
                        {field.type !== 'video' &&
                          field.type !== 'images' &&
                          values[field.key] !== CONTENT_DEFAULTS[field.key] && (
                            <button
                              type="button"
                              onClick={() => handleReset(field.key)}
                              className="text-[11px] text-coffee-400 hover:text-coffee-700"
                            >
                              Restablecer
                            </button>
                          )}
                      </div>
                    )}
                    {field.type === 'boolean' ? (
                      <label className="flex items-center gap-2.5 text-sm text-coffee-800">
                        <input
                          type="checkbox"
                          checked={values[field.key] === 'true'}
                          onChange={(e) => handleChange(field.key, e.target.checked ? 'true' : 'false')}
                          className="h-4 w-4 accent-coffee-900"
                        />
                        {field.label}
                      </label>
                    ) : field.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={values[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-cream-200 bg-transparent p-1"
                        />
                        <input
                          value={values[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={CONTENT_DEFAULTS[field.key]}
                          className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm uppercase focus:outline-none focus:border-coffee-600"
                        />
                      </div>
                    ) : field.type === 'video' ? (
                      <div>
                        <MediaUploader
                          label=""
                          kind="video"
                          items={values[field.key] ? [values[field.key]] : []}
                          onChange={(items) => handleChange(field.key, items[items.length - 1] ?? '')}
                        />
                        <p className="mt-1.5 text-xs text-coffee-500">
                          Opcional. Si subes un video, reemplaza el fondo de la portada (tiene prioridad
                          sobre el carrusel de imágenes).
                        </p>
                      </div>
                    ) : field.type === 'images' ? (
                      <div>
                        <MediaUploader
                          label=""
                          kind="image"
                          items={parseImageList(values[field.key])}
                          onChange={(items) => handleChange(field.key, JSON.stringify(items))}
                        />
                        <p className="mt-1.5 text-xs text-coffee-500">
                          Sube 2 o más imágenes para que roten cada 5 segundos en el fondo de la portada.
                          Solo se usa si no hay un video configurado.
                        </p>
                      </div>
                    ) : field.type === 'image' ? (
                      <div>
                        <MediaUploader
                          label=""
                          kind="image"
                          items={values[field.key] ? [values[field.key]] : []}
                          onChange={(items) => handleChange(field.key, items[items.length - 1] ?? '')}
                        />
                        <p className="mt-1.5 text-xs text-coffee-500">
                          {field.key === 'site.logo_url'
                            ? 'Opcional. Si subes un logo, reemplaza el texto "AFRA°" del menú. Quítalo para volver al texto.'
                            : 'Usa una imagen cuadrada (idealmente 512×512px). Se aplica en la pestaña del navegador.'}
                        </p>
                      </div>
                    ) : field.multiline ? (
                      <textarea
                        value={values[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={CONTENT_DEFAULTS[field.key]}
                        rows={3}
                        className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
                      />
                    ) : (
                      <input
                        value={values[field.key]}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={CONTENT_DEFAULTS[field.key]}
                        className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
                      />
                    )}
                  </div>
                ))}
              </div>
              {activeTab === 'Preguntas frecuentes' && (
                <div className="mt-6 border-t border-cream-200 pt-6">
                  <p className="mb-1.5 text-xs font-medium text-coffee-600">Preguntas y respuestas</p>
                  <RepeatableListEditor
                    value={values['faq.items']}
                    onChange={(json) => handleChange('faq.items', json)}
                    fields={[
                      { key: 'question', label: 'Pregunta' },
                      { key: 'answer', label: 'Respuesta', type: 'textarea' },
                    ]}
                    emptyItem={{ question: '', answer: '' }}
                    addLabel="Agregar pregunta"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  dirty,
  onClick,
}: {
  label: string;
  active: boolean;
  dirty: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:whitespace-normal ${
        active ? 'bg-coffee-900 text-cream-50' : 'text-coffee-700 hover:bg-cream-100'
      }`}
    >
      {label}
      {dirty && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-cream-50' : 'bg-amber-600'}`}
          aria-label="Cambios sin guardar"
        />
      )}
    </button>
  );
}

function SectionHeader({ title, hint, previewPath }: { title: string; hint?: string; previewPath?: string }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-cream-200 pb-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-coffee-900">{title}</h2>
        {hint && <p className="mt-1 text-xs text-coffee-500">{hint}</p>}
      </div>
      {previewPath && (
        <Link
          href={previewPath}
          target="_blank"
          className="shrink-0 text-xs text-coffee-500 underline hover:text-coffee-800"
        >
          Ver en la web ↗
        </Link>
      )}
    </div>
  );
}
