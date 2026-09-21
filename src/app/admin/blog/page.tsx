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

export default function AdminBlogPage() {
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Blog</h1>
        {editingId === null && (
          <button
            onClick={startCreate}
            className="rounded-full bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50"
          >
            + Nuevo artículo
          </button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mb-10 max-w-2xl space-y-4 rounded-2xl border border-cream-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-700">
            {editingId === 'new' ? 'Nuevo artículo' : 'Editar artículo'}
          </h2>

          <input
            placeholder="Título"
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: editingId === 'new' ? slugify(title) : f.slug }));
            }}
            required
            className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug (url)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
            className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Resumen (aparece en la lista del blog)"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            required
            rows={2}
            className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Contenido (separa párrafos con una línea en blanco)"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={10}
            className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
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
              className="bg-coffee-900 text-cream-50 py-2 px-6 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelEdit} className="py-2 px-6 rounded-lg text-sm text-coffee-600">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {posts.map((p) => (
          <div key={p.id} className="border border-cream-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-coffee-900">{p.title}</p>
              <p className="text-sm text-coffee-600">
                /blog/{p.slug} · {new Date(p.publishedAt).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button onClick={() => startEdit(p)} className="text-sm text-coffee-700 hover:text-coffee-900">
                Editar
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-sm text-red-600">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
