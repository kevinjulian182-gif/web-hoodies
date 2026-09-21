'use client';

import { useEffect, useState } from 'react';
import MediaUploader from '@/components/admin/MediaUploader';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  publishedAt: string;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
};

const emptyForm: FormState = { title: '', slug: '', excerpt: '', content: '', coverImage: '' };

function toForm(p: Post): FormState {
  return { title: p.title, slug: p.slug, excerpt: p.excerpt, content: p.content, coverImage: p.coverImage };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function BlogManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/blog');
    if (res.ok) setPosts(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditingId('new');
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.coverImage) {
      setError('Sube una imagen de portada');
      return;
    }
    setSaving(true);
    const res =
      editingId === 'new'
        ? await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch(`/api/admin/blog/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
    setSaving(false);
    if (!res.ok) {
      setError('No se pudo guardar el artículo (revisa que el slug no esté repetido)');
      return;
    }
    cancelEdit();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este artículo? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      {editingId === null && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={startCreate}
            className="rounded-full bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
          >
            + Nuevo artículo
          </button>
        </div>
      )}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-2xl border border-cream-200 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-coffee-700">
            {editingId === 'new' ? 'Nuevo artículo' : 'Editar artículo'}
          </h3>

          <input
            placeholder="Título"
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: editingId === 'new' ? slugify(title) : f.slug }));
            }}
            required
            className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
          />
          <input
            placeholder="Slug (url)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
            className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
          />
          <textarea
            placeholder="Resumen (aparece en la lista del blog)"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            required
            rows={2}
            className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
          />
          <textarea
            placeholder="Contenido (separa párrafos con una línea en blanco)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={10}
            className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm focus:outline-none focus:border-coffee-600"
          />

          <MediaUploader
            label="Imagen de portada"
            kind="image"
            items={form.coverImage ? [form.coverImage] : []}
            onChange={(items) => setForm({ ...form, coverImage: items[items.length - 1] ?? '' })}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-coffee-900 px-6 py-2 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg px-6 py-2 text-sm text-coffee-600 transition-colors hover:text-coffee-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {posts.length === 0 && editingId === null ? (
        <p className="rounded-xl border border-dashed border-cream-300 py-10 text-center text-sm text-coffee-500">
          Todavía no hay artículos publicados.
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-cream-200 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-coffee-900">{p.title}</p>
                <p className="text-sm text-coffee-600">
                  /blog/{p.slug} · {new Date(p.publishedAt).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => startEdit(p)}
                  className="text-sm text-coffee-700 transition-colors hover:text-coffee-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-sm text-red-600 transition-colors hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
