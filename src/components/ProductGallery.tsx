'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useProductColor } from '@/lib/productColor';

type Media = { type: 'image' | 'video'; src: string };

export default function ProductGallery({
  images,
  colorImages = {},
  videos = [],
  name,
}: {
  images: string[];
  colorImages?: Record<string, string[]>;
  videos?: string[];
  name: string;
}) {
  const { selectedColor } = useProductColor();
  // A color only overrides the gallery if someone actually uploaded photos
  // for it — colors without their own set keep showing the product's
  // default images rather than an empty gallery.
  const effectiveImages = colorImages[selectedColor]?.length ? colorImages[selectedColor] : images;

  const media: Media[] = [
    ...effectiveImages.map((src) => ({ type: 'image' as const, src })),
    ...videos.map((src) => ({ type: 'video' as const, src })),
  ];
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const current = media[active];

  // Jump back to the first photo whenever the color switch actually swaps
  // the image set, so you don't land on an out-of-range index or on photo
  // #3 of a different colorway.
  useEffect(() => {
    setActive(0);
  }, [selectedColor]);

  const goTo = (i: number) => setActive(((i % media.length) + media.length) % media.length);

  // Swipe support for the main image on mobile — the thumbnail strip is the
  // only way to change photos otherwise, and tapping tiny thumbnails isn't
  // how anyone actually browses a product's photos on a phone.
  const SWIPE_THRESHOLD = 50;
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (media.length < 2) return;
    const swipedLeft = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500;
    const swipedRight = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500;
    if (swipedLeft) goTo(active + 1);
    else if (swipedRight) goTo(active - 1);
  };

  // Lightbox: Escape to close, arrow keys to browse, body scroll locked
  // while open — same pattern as the cart drawer.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowRight') goTo(active + 1);
      else if (e.key === 'ArrowLeft') goTo(active - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, active, media.length]);

  return (
    <>
      {/* flex-col-reverse + md:flex-row (no reverse) puts the thumbnails strip
          wherever it reads first in the DOM: below the main image on mobile,
          to its left on desktop — no JS reordering needed for either layout.
          self-start: without it, the PDP's grid stretches this column to match
          the buy panel's height, which then stretches the image frame taller
          than its real aspect ratio. */}
      <div className="flex flex-col-reverse gap-3 self-start md:flex-row md:gap-4">
        {media.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 md:w-20 md:shrink-0 md:flex-col md:overflow-x-visible md:overflow-y-auto md:pb-0">
            {media.map((item, i) => (
              <button
                key={`${item.type}-${item.src}`}
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1} de ${media.length}`}
                aria-current={active === i}
                className={`relative aspect-[4/5] h-20 shrink-0 overflow-hidden rounded-lg border bg-cream-50 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] md:h-auto md:w-full ${
                  active === i
                    ? 'border-coffee-900 ring-2 ring-coffee-900 ring-offset-2 ring-offset-cream-50'
                    : 'border-cream-200 opacity-70 hover:opacity-100 hover:border-coffee-300'
                }`}
              >
                {item.type === 'image' ? (
                  <Image src={item.src} alt={`${name} — foto ${i + 1}`} fill className="object-cover" sizes="80px" />
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

        <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-2xl border border-cream-200/70 bg-cream-50 touch-pan-y">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              drag={media.length > 1 && current?.type === 'image' ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={handleDragEnd}
              className="absolute inset-0"
            >
              {current?.type === 'image' && (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="Ampliar foto"
                  className="group/zoom absolute inset-0 h-full w-full cursor-zoom-in"
                >
                  <Image
                    src={current.src}
                    alt={name}
                    fill
                    className="pointer-events-none object-contain"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 hidden h-9 w-9 items-center justify-center rounded-full bg-cream-50/90 text-coffee-900 opacity-0 shadow-sm transition-opacity duration-150 group-hover/zoom:opacity-100 md:flex">
                    <ZoomIcon />
                  </span>
                </button>
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

          {media.length > 1 && (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-coffee-900/70 px-2.5 py-1 text-[11px] font-medium text-cream-50 backdrop-blur-sm">
              {active + 1} / {media.length}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && current?.type === 'image' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-coffee-900/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${name} — foto ampliada`}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20"
            >
              <CloseIcon />
            </button>

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(active - 1);
                  }}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20 md:left-4"
                >
                  <ChevronIcon direction="left" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(active + 1);
                  }}
                  aria-label="Siguiente foto"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20 md:right-4"
                >
                  <ChevronIcon direction="right" />
                </button>
              </>
            )}

            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              drag={media.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={handleDragEnd}
              className="relative h-[80vh] w-[90vw] max-w-4xl touch-pan-y"
            >
              <Image
                src={current.src}
                alt={name}
                fill
                className="pointer-events-none object-contain"
                sizes="90vw"
              />
            </motion.div>

            {media.length > 1 && (
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-cream-50/10 px-3 py-1 text-xs font-medium text-cream-50">
                {active + 1} / {media.length}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-cream-50">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      <path d="M11 8v6M8 11h6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
