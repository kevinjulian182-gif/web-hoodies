'use client';

import { motion } from 'framer-motion';

type Review = { id: string; authorName: string; rating: number; comment: string; createdAt: Date };

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden="true" className="text-coffee-900">
      {'★'.repeat(Math.round(rating))}
      <span className="text-coffee-300">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default function ReviewsSection({ title, reviews }: { title: string; reviews: Review[] }) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="border-t border-cream-200 py-16">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-baseline gap-3"
        >
          <h2 className="text-2xl font-semibold tracking-tightest text-coffee-900">{title}</h2>
          <span className="flex items-center gap-1.5 text-sm text-coffee-600">
            <Stars rating={average} />
            <span aria-label={`${average.toFixed(1)} de 5`}>
              {average.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
            </span>
          </span>
        </motion.div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-cream-200 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-coffee-900">{review.authorName}</p>
                <Stars rating={review.rating} />
              </div>
              <p className="mt-2 text-sm text-coffee-600 leading-relaxed">{review.comment}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
