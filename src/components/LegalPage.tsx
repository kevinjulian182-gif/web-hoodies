import Link from 'next/link';
import { LEGAL_UPDATED_LABEL } from '@/lib/legal';

const PAGES = [
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/reembolsos', label: 'Cambios y reembolsos' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/cookies', label: 'Cookies' },
];

export function LegalPage({
  current,
  title,
  intro,
  sections,
  children,
}: {
  current: string;
  title: string;
  intro: React.ReactNode;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-14 md:pt-20">
      <nav aria-label="Documentos legales" className="scrollbar-none -mx-6 mb-10 flex gap-2 overflow-x-auto px-6">
        {PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            aria-current={page.href === current ? 'page' : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              page.href === current
                ? 'border-coffee-900 bg-coffee-900 text-cream-50'
                : 'border-cream-300 text-coffee-700 hover:border-coffee-700'
            }`}
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <h1 className="text-3xl font-semibold tracking-tightest text-coffee-900 md:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-coffee-500">Última actualización: {LEGAL_UPDATED_LABEL}</p>
      <div className="mt-6 text-base leading-relaxed text-coffee-700">{intro}</div>

      <nav aria-label="Contenido" className="mt-8 rounded-2xl border border-cream-200 bg-cream-100/50 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-coffee-500">En esta página</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-coffee-700 underline-offset-4 hover:text-coffee-900 hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10 leading-relaxed text-coffee-700 [&_a]:font-medium [&_a]:text-coffee-900 [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-coffee-900">
        {n}. {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalIdentity({
  info,
}: {
  info: { name: string; nit: string; address: string; email: string; phone: string };
}) {
  return (
    <ul className="!list-none rounded-xl bg-cream-100/60 p-4 !pl-4 text-sm">
      <li>
        <strong className="text-coffee-900">Titular:</strong> {info.name}
        {info.nit && <> · NIT/C.C. {info.nit}</>}
      </li>
      {info.address && (
        <li>
          <strong className="text-coffee-900">Dirección:</strong> {info.address}
        </li>
      )}
      {info.email && (
        <li>
          <strong className="text-coffee-900">Correo:</strong> <a href={`mailto:${info.email}`}>{info.email}</a>
        </li>
      )}
      {info.phone && (
        <li>
          <strong className="text-coffee-900">Teléfono / WhatsApp:</strong> {info.phone}
        </li>
      )}
      <li>
        <strong className="text-coffee-900">Sitio web:</strong> wearafra.com
      </li>
    </ul>
  );
}
