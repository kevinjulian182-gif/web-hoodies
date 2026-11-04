'use client';

import { motion } from 'framer-motion';

type Content = {
  eyebrow: string;
  title: string;
  steps: { title: string; body: string }[];
};

export default function HowItWorks({ content }: { content: Content }) {
  return (
    <section className="border-t border-cream-200 bg-cream-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-coffee-500">{content.eyebrow}</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tightest text-coffee-900">
            {content.title}
          </h2>
        </div>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-cream-300 lg:block" />
          {content.steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-coffee-900 text-sm font-semibold text-cream-50">
                {i + 1}
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tightest text-coffee-900">{step.title}</h3>
              <p className="mt-2 text-sm text-coffee-600 leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
