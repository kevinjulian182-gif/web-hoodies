'use client';

import { motion } from 'framer-motion';
import type { FaqItem } from '@/lib/content';

export default function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-cream-200 bg-cream-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center text-2xl md:text-3xl font-semibold tracking-tightest text-coffee-900">
          {title}
        </h2>
        <div className="mt-10 divide-y divide-cream-200 border-t border-b border-cream-200">
          {items.map((item, i) => (
            <motion.details
              key={item.question}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.05 }}
              className="group py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-coffee-900 marker:content-none">
                {item.question}
                <span className="shrink-0 text-lg text-coffee-500 transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm text-coffee-600 leading-relaxed">{item.answer}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}
