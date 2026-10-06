'use client';

import { useRef, useState } from 'react';

const MAX_IMAGE_DIMENSION = 2000;

// Vercel's serverless functions reject request bodies over ~4.5MB before our
// own route handler (and its sharp compression) ever runs — a pasted
// screenshot or camera photo routinely exceeds that as raw PNG/HEIC. Shrink
// it in the browser first so the upload almost always fits regardless of
// the original size; the server still re-compresses to WebP on top of this.
async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // JPEG has no alpha channel: a transparent PNG (a pasted screenshot,
    // a logo) would otherwise composite onto the canvas's default
    // transparent-black, turning every see-through pixel solid black.
    // Fill white first so transparency becomes white instead.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^./]+$/, '') || 'imagen';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function MediaUploader({
  label,
  kind,
  items,
  onChange,
}: {
  label: string;
  kind: 'image' | 'video';
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [removingBg, setRemovingBg] = useState<Set<string>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const [removingAll, setRemovingAll] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // Runs entirely in the browser (WASM model, no API key, no cost) — the
  // import is dynamic so it doesn't add weight to the editor's initial
  // bundle for admins who never use this button. Returns the new, uploaded
  // URL instead of touching `items` directly, so the bulk action below can
  // batch several of these without each call racing the others over the
  // same `items` closure.
  const stripOneBackground = async (url: string): Promise<string> => {
    const { removeBackground: stripBackground } = await import('@imgly/background-removal');
    const result = await stripBackground(url);
    const form = new FormData();
    form.append('file', new File([result], 'sin-fondo.png', { type: 'image/png' }));
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
    let data: { url?: string; error?: string };
    try {
      data = await res.json();
    } catch {
      throw new Error('No se pudo subir la imagen sin fondo. Intenta de nuevo.');
    }
    if (!res.ok || !data.url) throw new Error(data.error ?? 'No se pudo subir la imagen sin fondo');
    return data.url;
  };

  const removeBackground = async (url: string) => {
    setError('');
    setRemovingBg((prev) => new Set(prev).add(url));
    try {
      const newUrl = await stripOneBackground(url);
      onChange(items.map((i) => (i === url ? newUrl : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el fondo');
    } finally {
      setRemovingBg((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  // Processes one photo at a time (not in parallel) so the WASM model isn't
  // asked to run several inferences at once on a single admin's browser,
  // and saves after every photo so a failure partway through doesn't lose
  // the ones that already succeeded.
  const removeBackgroundFromAll = async () => {
    setError('');
    setRemovingAll(true);
    const targets = items.filter((url) => !url.endsWith('.svg'));
    setBulkProgress({ done: 0, total: targets.length });
    // Build on this local copy (not the `items` prop, which stays frozen at
    // its value from when this call started) so each iteration's onChange
    // includes every photo already swapped earlier in the same run.
    let working = [...items];
    let failures = 0;
    for (const url of targets) {
      setRemovingBg((prev) => new Set(prev).add(url));
      try {
        const newUrl = await stripOneBackground(url);
        working = working.map((i) => (i === url ? newUrl : i));
        onChange(working);
      } catch {
        failures += 1;
      } finally {
        setRemovingBg((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
        setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }
    if (failures > 0) {
      setError(`No se pudo quitar el fondo de ${failures} de ${targets.length} foto${targets.length === 1 ? '' : 's'}.`);
    }
    setRemovingAll(false);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setError('');
    setUploading(true);
    const uploaded: string[] = [];
    for (const rawFile of Array.from(files)) {
      const file = kind === 'image' ? await compressImageFile(rawFile) : rawFile;
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
        let data: { url?: string; error?: string };
        try {
          data = await res.json();
        } catch {
          // The platform (not our route) rejected the request outright —
          // e.g. a 413 with a plain-text body — before it ever became JSON.
          throw new Error(
            res.status === 413
              ? 'El archivo es demasiado grande para subirlo directamente. Intenta con uno más liviano.'
              : 'No se pudo subir el archivo. Intenta de nuevo.'
          );
        }
        if (!res.ok) throw new Error(data.error ?? 'Error al subir');
        if (data.url) uploaded.push(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al subir el archivo');
      }
    }
    if (uploaded.length > 0) onChange([...items, ...uploaded]);
    setUploading(false);
  };

  const remove = (url: string) => onChange(items.filter((i) => i !== url));

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith(`${kind}/`))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-coffee-600">
          {label}
          {kind === 'image' && items.length > 1 && (
            <span className="ml-1.5 text-coffee-400">— arrastra para reordenar, la primera es la principal</span>
          )}
        </p>
        {kind === 'image' && items.length > 1 && (
          <button
            type="button"
            onClick={removeBackgroundFromAll}
            disabled={removingAll}
            className="shrink-0 text-xs font-medium text-coffee-700 underline decoration-cream-300 underline-offset-2 hover:text-coffee-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removingAll ? `Quitando fondo… (${bulkProgress.done}/${bulkProgress.total})` : 'Quitar fondo a todas'}
          </button>
        )}
      </div>
      <div
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center text-sm transition-colors ${
          dragOver ? 'border-coffee-600 bg-cream-100' : 'border-cream-300 text-coffee-500'
        }`}
      >
        {uploading
          ? 'Subiendo…'
          : `Arrastra ${kind === 'image' ? 'imágenes' : 'videos'} aquí, haz clic para elegir, o pega con Ctrl+V`}
        <input
          ref={inputRef}
          type="file"
          accept={kind === 'image' ? 'image/*' : 'video/*'}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((url, index) => (
            <div
              key={url}
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
              className={`relative cursor-move transition-opacity ${
                dragIndex === index ? 'opacity-40' : ''
              } ${overIndex === index && dragIndex !== null && dragIndex !== index ? 'ring-2 ring-coffee-600 rounded-lg' : ''}`}
            >
              {kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-20 w-16 rounded-lg object-cover border border-cream-200" draggable={false} />
              ) : (
                <video src={url} className="h-20 w-28 rounded-lg object-cover border border-cream-200" muted />
              )}
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-coffee-900/80 px-1 py-0.5 text-[8px] font-medium leading-none text-cream-50">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Quitar"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-coffee-900 text-xs text-cream-50"
              >
                ×
              </button>
              {kind === 'image' && (
                <button
                  type="button"
                  onClick={() => removeBackground(url)}
                  disabled={removingBg.has(url)}
                  title="Quitar fondo"
                  className="absolute inset-x-0 bottom-0 rounded-b-lg bg-coffee-900/80 py-0.5 text-center text-[9px] font-medium leading-tight text-cream-50 disabled:opacity-60"
                >
                  {removingBg.has(url) ? '…' : 'Quitar fondo'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
