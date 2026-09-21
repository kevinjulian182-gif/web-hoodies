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
    // flex-col-reverse + md:flex-row (no reverse) puts the thumbnails strip
    // wherever it reads first in the DOM: below the main image on mobile,
    // to its left on desktop — no JS reordering needed for either layout.
    // self-start: without it, the PDP's grid stretches this column to match
    // the buy panel's height, which then stretches the square image frame
    // into a tall rectangle regardless of aspect-square.
    <div className="flex flex-col-reverse gap-3 self-start md:flex-row md:gap-4">
      {media.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 md:w-20 md:shrink-0 md:flex-col md:overflow-x-visible md:overflow-y-auto md:pb-0">
          {media.map((item, i) => (
            <button
              key={item.src}
              onClick={() => setActive(i)}
              className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-50 transition-opacity md:w-full ${
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

      <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl bg-cream-50">
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
              <Image src={current.src} alt={name} fill className="object-contain" priority sizes="(max-width: 768px) 100vw, 50vw" />
            )}
            {current?.type === 'video' && (
              <video
                src={current.src}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
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
