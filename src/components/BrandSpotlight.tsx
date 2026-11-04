'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type SpotlightContent = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
  cta: string;
};

export default function BrandSpotlight({ content }: { content: SpotlightContent }) {
  return (
    <section className="relative overflow-hidden bg-coffee-900 text-cream-50">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen">
        <div className="absolute -top-1/4 left-1/4 h-[32rem] w-[32rem] rounded-full bg-cream-50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-28 md:py-36 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium uppercase tracking-[0.3em] text-cream-100/60 mb-6"
        >
          {content.eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-6xl font-semibold tracking-tightest leading-[1.05] text-cream-50"
        >
          {content.titleLine1}
          <br />
          {content.titleLine2}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-base md:text-lg text-cream-100/70 max-w-xl mx-auto leading-relaxed"
        >
          {content.body}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <Link
            href="/nosotros"
            className="group inline-flex items-center gap-2 border border-cream-50/30 px-8 py-4 rounded-full text-sm font-medium tracking-wide text-cream-50 hover:bg-cream-50 hover:text-coffee-900 transition-colors"
          >
            {content.cta}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
