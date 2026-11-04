'use client';

import type { SizeChart } from '@/lib/sizeChart';

const MAX_COLUMNS = 8;

export default function SizeChartEditor({
  sizes,
  value,
  onChange,
  title = 'Tabla de tallas (opcional)',
  hint = 'Aparece como “Guía de tallas” en la página del producto. Si la dejas vacía, se usa la guía general de la tienda (Contenido → Guía de tallas) o, para pantalones, shorts, gorras y medias, una guía genérica según el tipo de prenda.',
}: {
  sizes: string[];
  value: SizeChart;
  onChange: (next: SizeChart) => void;
  title?: string;
  hint?: string;
}) {
  const setColumn = (index: number, name: string) =>
    onChange({ ...value, columns: value.columns.map((c, i) => (i === index ? name : c)) });

  const addColumn = () => onChange({ ...value, columns: [...value.columns, ''] });

  const removeColumn = (index: number) =>
    onChange({
      ...value,
      columns: value.columns.filter((_, i) => i !== index),
      rows: Object.fromEntries(Object.entries(value.rows).map(([size, vals]) => [size, vals.filter((_, i) => i !== index)])),
    });

  const setCell = (size: string, index: number, cell: string) => {
    const row = [...(value.rows[size] ?? [])];
    while (row.length < value.columns.length) row.push('');
    row[index] = cell;
    onChange({ ...value, rows: { ...value.rows, [size]: row } });
  };

  return (
    <div>
      <div className="mb-1.5">
        <p className="text-xs font-medium text-coffee-600">{title}</p>
        <p className="text-xs text-coffee-400">{hint}</p>
      </div>

      {sizes.length === 0 ? (
        <p className="text-xs text-coffee-400">Agrega tallas arriba para llenar la tabla.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-cream-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-coffee-600">Talla</th>
                  {value.columns.map((column, i) => (
                    <th key={i} className="px-1.5 py-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          value={column}
                          onChange={(e) => setColumn(i, e.target.value)}
                          placeholder="Medida (cm)"
                          aria-label={`Nombre de la columna ${i + 1}`}
                          className="w-28 min-w-0 rounded-md border border-cream-200 bg-white px-2 py-1 text-xs font-medium text-coffee-800"
                        />
                        <button
                          type="button"
                          onClick={() => removeColumn(i)}
                          aria-label={`Quitar columna ${column || i + 1}`}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-coffee-400 transition-colors hover:bg-cream-100 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left">
                    {value.columns.length < MAX_COLUMNS && (
                      <button
                        type="button"
                        onClick={addColumn}
                        className="whitespace-nowrap rounded-md border border-dashed border-cream-300 px-2 py-1 text-xs text-coffee-600 transition-colors hover:border-coffee-400 hover:text-coffee-900"
                      >
                        + Columna
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size} className="border-b border-cream-100 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-coffee-800">{size}</td>
                    {value.columns.map((_, i) => (
                      <td key={i} className="px-1.5 py-1">
                        <input
                          value={value.rows[size]?.[i] ?? ''}
                          onChange={(e) => setCell(size, i, e.target.value)}
                          inputMode="decimal"
                          placeholder="—"
                          aria-label={`${size} — ${value.columns[i] || `columna ${i + 1}`}`}
                          className="w-28 rounded-md border border-cream-200 bg-white px-2 py-1 text-sm text-coffee-900"
                        />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <input
            value={value.note ?? ''}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
            placeholder="Nota opcional, ej: Medidas de la prenda en plano. Si estás entre dos tallas, elige la más grande."
            maxLength={300}
            className="mt-2 w-full rounded-lg border border-cream-200 px-3 py-2 text-sm"
          />
        </>
      )}
    </div>
  );
}
