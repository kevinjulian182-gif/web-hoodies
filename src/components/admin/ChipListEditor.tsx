'use client';

import { useState } from 'react';

export default function ChipListEditor({
  label,
  items,
  onChange,
  suggestions = [],
  swatch,
  onSwatchChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
  swatch?: (value: string) => string;
  /** When set alongside `swatch`, the static color dot becomes a native
   * color input (with the browser's eyedropper) so the admin can pick an
   * exact hex per color instead of relying on the name-based guess. */
  onSwatchChange?: (value: string, hex: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const add = (value: string) => {
    const v = value.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };

  const remove = (value: string) => onChange(items.filter((i) => i !== value));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div>
      <p className="mb-1.5 text-xs text-coffee-600">
        {label}
        {items.length > 1 && <span className="ml-1.5 text-coffee-400">— arrastra para reordenar</span>}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, index) => (
          <span
            key={item}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setDragIndex(index);
            }}
            onDragEnter={(e) => {
              e.stopPropagation();
              if (dragIndex !== null) setOverIndex(index);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragIndex !== null) reorder(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`flex cursor-move items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 pl-2.5 pr-1.5 py-1 text-xs text-coffee-800 transition-opacity ${
              dragIndex === index ? 'opacity-40' : ''
            } ${overIndex === index && dragIndex !== null && dragIndex !== index ? 'ring-2 ring-coffee-600' : ''}`}
          >
            {swatch && onSwatchChange ? (
              <input
                type="color"
                value={swatch(item)}
                onChange={(e) => onSwatchChange(item, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                draggable={false}
                title="Elegir color exacto (incluye cuentagotas)"
                className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-full border border-cream-300 p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
              />
            ) : (
              swatch && (
                <span
                  className="h-3 w-3 rounded-full border border-cream-300"
                  style={{ backgroundColor: swatch(item) }}
                />
              )
            )}
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              className="text-coffee-400 hover:text-coffee-800"
              aria-label={`Quitar ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Agregar y presionar Enter"
          className="flex-1 rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="rounded-lg border border-cream-300 px-3 py-1.5 text-sm text-coffee-700"
        >
          Agregar
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !items.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-cream-300 px-2.5 py-1 text-[11px] text-coffee-500 hover:border-coffee-500 hover:text-coffee-700"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
