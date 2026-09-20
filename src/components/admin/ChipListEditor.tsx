'use client';

import { useState } from 'react';

export default function ChipListEditor({
  label,
  items,
  onChange,
  suggestions = [],
  swatch,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions?: string[];
  swatch?: (value: string) => string;
}) {
  const [draft, setDraft] = useState('');

  const add = (value: string) => {
    const v = value.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };

  const remove = (value: string) => onChange(items.filter((i) => i !== value));

  return (
    <div>
      <p className="mb-1.5 text-xs text-coffee-600">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 pl-2.5 pr-1.5 py-1 text-xs text-coffee-800"
          >
            {swatch && (
              <span
                className="h-3 w-3 rounded-full border border-cream-300"
                style={{ backgroundColor: swatch(item) }}
              />
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
