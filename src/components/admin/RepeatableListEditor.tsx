'use client';

import MediaUploader from '@/components/admin/MediaUploader';

type FieldSpec = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'image';
};

export default function RepeatableListEditor({
  value,
  onChange,
  fields,
  emptyItem,
  addLabel = 'Agregar',
}: {
  value: string;
  onChange: (json: string) => void;
  fields: FieldSpec[];
  emptyItem: Record<string, string>;
  addLabel?: string;
}) {
  let items: Record<string, string>[] = [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }

  const update = (index: number, key: string, val: string) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: val } : item));
    onChange(JSON.stringify(next));
  };

  const remove = (index: number) => onChange(JSON.stringify(items.filter((_, i) => i !== index)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(JSON.stringify(next));
  };

  const add = () => onChange(JSON.stringify([...items, emptyItem]));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-cream-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-coffee-400">#{i + 1}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Subir"
                className="flex h-6 w-6 items-center justify-center rounded-full text-coffee-600 hover:bg-cream-100 disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Bajar"
                className="flex h-6 w-6 items-center justify-center rounded-full text-coffee-600 hover:bg-cream-100 disabled:opacity-25"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Eliminar"
                className="flex h-6 w-6 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
              >
                ×
              </button>
            </div>
          </div>
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-[11px] text-coffee-500">{field.label}</label>
              {field.type === 'image' ? (
                <MediaUploader
                  label=""
                  kind="image"
                  items={item[field.key] ? [item[field.key]] : []}
                  onChange={(vals) => update(i, field.key, vals[vals.length - 1] ?? '')}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={item[field.key] ?? ''}
                  onChange={(e) => update(i, field.key, e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
                />
              ) : (
                <input
                  value={item[field.key] ?? ''}
                  onChange={(e) => update(i, field.key, e.target.value)}
                  className="w-full rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-dashed border-cream-300 py-2 text-sm text-coffee-600 hover:border-coffee-500"
      >
        + {addLabel}
      </button>
    </div>
  );
}
