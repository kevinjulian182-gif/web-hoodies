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
  const inputRef = useRef<HTMLInputElement>(null);

  const removeBackground = async (url: string) => {
    setError('');
    setRemovingBg((prev) => new Set(prev).add(url));
    try {
      const res = await fetch('/api/admin/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      let data: { url?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error('No se pudo quitar el fondo. Intenta de nuevo.');
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'No se pudo quitar el fondo');
      onChange(items.map((i) => (i === url ? data.url! : i)));
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
      <p className="mb-1.5 text-xs text-coffee-600">{label}</p>
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
          {items.map((url) => (
            <div key={url} className="relative">
              {kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-20 w-16 rounded-lg object-cover border border-cream-200" />
              ) : (
                <video src={url} className="h-20 w-28 rounded-lg object-cover border border-cream-200" muted />
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
