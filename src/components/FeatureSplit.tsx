'use client';

import { motion } from 'framer-motion';

type Item = { title: string; body: string };

type Content = {
  eyebrow: string;
  title: string;
  body: string;
  items: Item[];
};

/** Shared 2-column "text + feature list" layout for the shipping and
 * quality/materials sections — `reverse` flips which side the text sits on
 * so back-to-back uses of this layout read as a zig-zag, not a repeat. */
export default function FeatureSplit({
  content,
  icon,
  reverse = false,
  tone = 'cream-50',
}: {
  content: Content;
  icon: React.ReactNode;
  reverse?: boolean;
  tone?: 'cream-50' | 'cream-100';
}) {
  return (
    <section className={`border-t border-cream-200 ${tone === 'cream-100' ? 'bg-cream-100' : 'bg-cream-50'}`}>
      <div
        className={`mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:gap-16 ${
          reverse ? 'md:[&>*:first-child]:order-2' : ''
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coffee-900 text-cream-50">
            {icon}
          </div>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-coffee-500">{content.eyebrow}</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tightest text-coffee-900">
            {content.title}
          </h2>
          <p className="mt-4 max-w-md text-sm text-coffee-600 leading-relaxed">{content.body}</p>
        </motion.div>

        <div className="flex flex-col justify-center gap-6">
          {content.items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-4 border-b border-cream-200 pb-6 last:border-0 last:pb-0"
            >
              <CheckIcon />
              <div>
                <h3 className="text-sm font-semibold text-coffee-900">{item.title}</h3>
                <p className="mt-1 text-sm text-coffee-600 leading-relaxed">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="mt-0.5 shrink-0 text-coffee-700"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
