'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream-50">
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-semibold tracking-tightest text-coffee-900"
        >
          Streetwear de élite.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-lg md:text-xl text-coffee-600 max-w-xl mx-auto"
        >
          Piezas originales de Nike, Supreme, Bape y más. Curado para quienes exigen lo mejor.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <Link
            href="/productos"
            className="inline-block bg-coffee-900 text-cream-50 px-8 py-4 rounded-full text-sm font-medium tracking-wide hover:bg-coffee-800 transition-colors"
          >
            Explorar colección
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
