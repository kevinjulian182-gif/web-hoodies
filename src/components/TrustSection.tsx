'use client';

import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Pago contra entrega',
    description: 'Recibe tu pedido y paga en la puerta de tu casa. Sin adelantos, sin riesgos.',
    icon: <TruckIcon />,
  },
  {
    title: 'Calidad garantizada',
    description: 'Cada pieza pasa por control de calidad antes de salir de bodega. 100% original.',
    icon: <BadgeIcon />,
  },
  {
    title: 'Materiales premium',
    description: 'Algodón pesado, felpa francesa y acabados que resisten el uso diario por años.',
    icon: <FabricIcon />,
  },
];

export default function TrustSection() {
  return (
    <section className="border-t border-cream-200 bg-cream-50">
      <div className="mx-auto max-w-7xl px-6 py-20 grid gap-12 md:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center md:text-left"
          >
            <div className="mx-auto md:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-cream-100 text-coffee-800">
              {feature.icon}
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tightest text-coffee-900">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-coffee-600 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 8h11v8H2z" strokeLinejoin="round" />
      <path d="M13 11h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l2.4 2.1 3.1-.5.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.5L12 22l-2.4-2.1-3.1.5-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.5L12 2Z" strokeLinejoin="round" />
      <path d="M9 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FabricIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4c2 1.5 2 3 0 4.5S2 12 4 13.5" strokeLinecap="round" />
      <path d="M9 4c2 1.5 2 3 0 4.5S7 12 9 13.5" strokeLinecap="round" />
      <path d="M14 4c2 1.5 2 3 0 4.5S12 12 14 13.5" strokeLinecap="round" />
      <path d="M4 18h16" strokeLinecap="round" />
      <path d="M4 21h16" strokeLinecap="round" />
    </svg>
  );
}
