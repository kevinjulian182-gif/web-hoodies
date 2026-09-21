import type { Metadata } from 'next';
import TrustSection from '@/components/TrustSection';
import { getSiteContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sobre nosotros — AFRA',
  description: 'La historia y los valores detrás de AFRA, streetwear de élite.',
};

const STATS = [
  { value: '7', label: 'marcas curadas' },
  { value: '100%', label: 'piezas originales' },
  { value: '2024', label: 'año de fundación' },
];

export default async function AboutPage() {
  const content = await getSiteContent();

  const values = [
    { title: content['nosotros.value1_title'], description: content['nosotros.value1_body'] },
    { title: content['nosotros.value2_title'], description: content['nosotros.value2_body'] },
    { title: content['nosotros.value3_title'], description: content['nosotros.value3_body'] },
  ];

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-28 pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-coffee-600 mb-6">
          {content['nosotros.eyebrow']}
        </p>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tightest text-coffee-900 leading-[1.05]">
          {content['nosotros.title_line1']}
          <br />
          {content['nosotros.title_line2']}
        </h1>
        <p className="mt-8 text-lg text-coffee-600 max-w-2xl mx-auto leading-relaxed">
          {content['nosotros.intro']}
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
        {values.map((value) => (
          <div key={value.title}>
            <h2 className="text-lg font-semibold tracking-tightest text-coffee-900">{value.title}</h2>
            <p className="mt-3 text-sm text-coffee-600 leading-relaxed">{value.description}</p>
          </div>
        ))}
      </section>

      <TrustSection
        content={{
          item1Title: content['trust.item1_title'],
          item1Body: content['trust.item1_body'],
          item2Title: content['trust.item2_title'],
          item2Body: content['trust.item2_body'],
          item3Title: content['trust.item3_title'],
          item3Body: content['trust.item3_body'],
        }}
      />
    </div>
  );
}
