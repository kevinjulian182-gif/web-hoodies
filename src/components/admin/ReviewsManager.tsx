'use client';

import { useEffect, useState } from 'react';

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function ReviewsManager({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/admin/products/${productId}/reviews`)
      .then((r) => r.json())
      .then(setReviews);
  };

  useEffect(load, [productId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName, rating, comment }),
    });
    setSaving(false);
    setAuthorName('');
    setComment('');
    setRating(5);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <p className="mb-1.5 text-xs text-coffee-600">Reseñas del producto</p>
      {reviews && reviews.length > 0 && (
        <div className="mb-3 space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-cream-200 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-coffee-900">
                  {r.authorName} · {'★'.repeat(r.rating)}
                  <span className="text-coffee-300">{'★'.repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-0.5 text-sm text-coffee-600">{r.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="shrink-0 text-xs text-red-600 hover:text-red-800"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
      {reviews && reviews.length === 0 && (
        <p className="mb-3 text-xs text-coffee-500">Sin reseñas todavía.</p>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-cream-300 p-3 sm:flex-row sm:items-start">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Nombre"
          className="w-full rounded-lg border border-cream-200 px-3 py-1.5 text-sm sm:w-32"
        />
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="rounded-lg border border-cream-200 px-2 py-1.5 text-sm"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentario"
          className="w-full flex-1 rounded-lg border border-cream-200 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="shrink-0 rounded-lg border border-cream-300 px-3 py-1.5 text-sm text-coffee-700 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
