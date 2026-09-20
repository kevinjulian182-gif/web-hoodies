'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

type Media = { type: 'image' | 'video'; src: string };

export default function ProductGallery({
  images,
  videos = [],
  name,
}: {
  images: string[];
  videos?: string[];
  name: string;
}) {
  const media: Media[] = [
    ...images.map((src) => ({ type: 'image' as const, src })),
    ...videos.map((src) => ({ type: 'video' as const, src })),
  ];
  const [active, setActive] = useState(0);
  const current = media[active];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {current?.type === 'image' && (
              <Image src={current.src} alt={name} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
            )}
            {current?.type === 'video' && (
              <video
                src={current.src}
                controls
                playsInline
                className="h-full w-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {media.length > 1 && (
        <div className="mt-4 flex gap-3">
          {media.map((item, i) => (
            <button
              key={item.src}
              onClick={() => setActive(i)}
              className={`relative h-20 w-16 overflow-hidden rounded-lg bg-cream-100 transition-opacity ${
                active === i ? 'opacity-100 ring-2 ring-coffee-900' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {item.type === 'image' ? (
                <Image src={item.src} alt={`${name} ${i + 1}`} fill className="object-cover" sizes="64px" />
              ) : (
                <>
                  <video src={item.src} className="h-full w-full object-cover" muted />
                  <span className="absolute inset-0 flex items-center justify-center bg-coffee-900/30">
                    <PlayIcon />
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cream-50">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}
