'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type Content = {
  eyebrow: string;
  title: string;
  body: string;
  buttonText: string;
  buttonHref: string;
};

export default function FinalCta({ content }: { content: Content }) {
  return (
    <section className="relative overflow-hidden border-t border-cream-200 bg-coffee-900 text-cream-50">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen">
        <div className="absolute -bottom-1/3 right-1/4 h-[36rem] w-[36rem] rounded-full bg-cream-50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium uppercase tracking-[0.3em] text-cream-100/60"
        >
          {content.eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-3xl md:text-5xl font-semibold tracking-tightest leading-[1.05] text-cream-50"
        >
          {content.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-md text-base text-cream-100/70 leading-relaxed"
        >
          {content.body}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9"
        >
          <Link
            href={content.buttonHref}
            className="inline-flex items-center gap-2 rounded-full bg-cream-50 px-9 py-4 text-sm font-semibold uppercase tracking-wide text-coffee-900 transition-transform active:scale-[0.97] hover:scale-[1.03]"
          >
            {content.buttonText}
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
