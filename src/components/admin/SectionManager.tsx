'use client';

import { HOME_SECTIONS, type HomeSectionEntry } from '@/lib/content';

function parseEntries(raw: string): HomeSectionEntry[] {
  let entries: HomeSectionEntry[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    entries = [];
  }
  const knownIds = entries.map((e) => e?.id).filter(Boolean);
  const missing = HOME_SECTIONS.filter((s) => !knownIds.includes(s.id)).map((s) => ({
    id: s.id,
    visible: true,
  }));
  return [...entries.filter((e) => HOME_SECTIONS.some((s) => s.id === e.id)), ...missing];
}

const LABELS: Record<string, string> = Object.fromEntries(HOME_SECTIONS.map((s) => [s.id, s.label]));

export default function SectionManager({ value, onChange }: { value: string; onChange: (json: string) => void }) {
  const entries = parseEntries(value);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(JSON.stringify(next));
  };

  const toggle = (index: number) => {
    const next = entries.map((e, i) => (i === index ? { ...e, visible: !e.visible } : e));
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            entry.visible ? 'border-cream-200' : 'border-cream-200 bg-cream-100/60'
          }`}
        >
          <label className="flex items-center gap-2.5 text-sm text-coffee-800">
            <input
              type="checkbox"
              checked={entry.visible}
              onChange={() => toggle(i)}
              className="h-4 w-4 accent-coffee-900"
            />
            {LABELS[entry.id] ?? entry.id}
            {!entry.visible && <span className="text-xs text-coffee-400">(oculta)</span>}
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="Subir sección"
              className="flex h-7 w-7 items-center justify-center rounded-full text-coffee-600 hover:bg-cream-100 disabled:opacity-25"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === entries.length - 1}
              aria-label="Bajar sección"
              className="flex h-7 w-7 items-center justify-center rounded-full text-coffee-600 hover:bg-cream-100 disabled:opacity-25"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
