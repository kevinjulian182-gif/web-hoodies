'use client';

import { useRef, useState } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    setError('');
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error al subir');
        uploaded.push(data.url);
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
