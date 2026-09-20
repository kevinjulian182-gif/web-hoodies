import type { Metadata } from 'next';
import TrustSection from '@/components/TrustSection';

export const metadata: Metadata = {
  title: 'Sobre nosotros — AFRA',
  description: 'La historia y los valores detrás de AFRA, streetwear de élite.',
};

const VALUES = [
  {
    title: 'Curaduría exigente',
    description:
      'No vendemos de todo. Cada marca y cada pieza pasa un filtro estricto de diseño, calidad y relevancia cultural antes de entrar al catálogo.',
  },
  {
    title: 'Autenticidad sin excepciones',
    description:
      'Trabajamos directamente con distribuidores autorizados. Cada prenda es 100% original, verificable y respaldada.',
  },
  {
    title: 'Servicio de cerca',
    description:
      'Pago contra entrega, seguimiento real de tu pedido y un equipo que responde — no un bot genérico.',
  },
];

const STATS = [
  { value: '7', label: 'marcas curadas' },
  { value: '100%', label: 'piezas originales' },
  { value: '2024', label: 'año de fundación' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-28 pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-coffee-600 mb-6">
          Sobre nosotros
        </p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tightest text-coffee-900 leading-[1.05]">
          Streetwear que se gana
          <br />
          su lugar en tu clóset.
        </h1>
        <p className="mt-8 text-lg text-coffee-600 max-w-2xl mx-auto leading-relaxed">
          AFRA nació de una obsesión simple: reunir en un solo lugar las piezas de streetwear que
          de verdad valen la pena, sin relleno y sin réplicas. Curamos, no acumulamos.
        </p>
      </section>

      <section className="border-y border-cream-200 bg-cream-100">
        <div className="mx-auto max-w-4xl px-6 py-12 grid grid-cols-3 gap-6 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-semibold tracking-tightest text-coffee-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs md:text-sm uppercase tracking-wide text-coffee-600">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 grid md:grid-cols-3 gap-12">
        {VALUES.map((value) => (
          <div key={value.title}>
            <h2 className="text-lg font-semibold tracking-tightest text-coffee-900">{value.title}</h2>
            <p className="mt-3 text-sm text-coffee-600 leading-relaxed">{value.description}</p>
          </div>
        ))}
      </section>

      <TrustSection />
    </div>
  );
}
