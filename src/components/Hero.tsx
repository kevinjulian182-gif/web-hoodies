'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const BRANDS = ['Nike', 'Adidas', 'Supreme', 'Drew House', 'Essentials', 'Tommy Hilfiger', 'Bape'];

type HeroContent = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  cta: string;
  videoUrl?: string;
  images?: string[];
};

export default function Hero({ content }: { content: HeroContent }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const hasVideo = Boolean(content.videoUrl);
  const images = content.images ?? [];
  const hasImages = !hasVideo && images.length > 0;
  const hasMedia = hasVideo || hasImages;

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (!hasImages || images.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [hasImages, images.length]);

  return (
    <section ref={ref} className={`relative overflow-hidden ${hasMedia ? 'bg-coffee-900' : 'bg-cream-50'}`}>
      {hasVideo ? (
        <div className="absolute inset-0">
          <video
            src={content.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-coffee-900/55" />
        </div>
      ) : hasImages ? (
        <div className="absolute inset-0">
          {images.map((src, i) => (
            <motion.div
              key={src}
              className="absolute inset-0"
              animate={{ opacity: i === slide ? 1 : 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              <Image src={src} alt="" fill priority={i === 0} className="object-cover" sizes="100vw" />
            </motion.div>
          ))}
          <div className="absolute inset-0 bg-coffee-900/55" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-coffee-600/[0.06] blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/3 -right-24 h-[24rem] w-[24rem] rounded-full bg-coffee-800/[0.05] blur-3xl"
          />
          <div className="absolute inset-0 opacity-[0.035] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27><filter id=%27n%27><feTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/></filter><rect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/></svg>")' }} />
        </div>
      )}

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto max-w-7xl px-6 pt-32 pb-28 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`text-xs font-medium uppercase tracking-[0.3em] mb-6 ${hasMedia ? 'text-cream-100/70' : 'text-coffee-600'}`}
        >
          {content.eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className={`text-6xl md:text-8xl font-semibold tracking-tightest leading-[0.95] ${hasMedia ? 'text-cream-50' : 'text-coffee-900'}`}
        >
          {content.titleLine1}
          <br />
          {content.titleLine2}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`mt-8 text-lg md:text-xl max-w-xl mx-auto ${hasMedia ? 'text-cream-100/80' : 'text-coffee-600'}`}
        >
          {content.subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <Link
            href="/productos"
            className={`group inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-medium tracking-wide transition-all active:scale-[0.97] ${
              hasMedia
                ? 'bg-cream-50 text-coffee-900 hover:bg-cream-100'
                : 'bg-coffee-900 text-cream-50 hover:bg-coffee-800'
            }`}
          >
            {content.cta}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </motion.div>
      </motion.div>

      <div
        className={`relative border-t py-6 overflow-hidden ${hasMedia ? 'border-cream-50/15' : 'border-cream-200'}`}
      >
        <div className="flex w-max animate-marquee gap-16">
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <span
              key={i}
              className={`text-sm font-medium uppercase tracking-[0.2em] whitespace-nowrap ${
                hasMedia ? 'text-cream-100/60' : 'text-coffee-500'
              }`}
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
