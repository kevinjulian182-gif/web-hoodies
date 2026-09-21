'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

// No AnimatePresence here on purpose: with mode="wait" this component held
// the OLD page in an exit animation and only mounted the new page once that
// exit's rAF loop reported complete. If that callback never fired (tab
// backgrounded mid-navigation, an RSC boundary swapping children out from
// under the exiting node), the new page's content sat in the DOM but never
// reached opacity 1 — present but invisible until a full reload. A plain
// keyed mount+animate has no such coordination step.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
