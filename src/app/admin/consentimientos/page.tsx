import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ensureConsentTable } from '@/lib/consent';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  checkout: 'Compra en la web',
  whatsapp_order: 'Pedido por WhatsApp',
  newsletter: 'Newsletter',
  cookies: 'Cookies',
};

const yes = (v: boolean) => (v ? 'Sí' : '—');

export default async function ConsentsPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { q = '', tipo = '' } = await searchParams;
  await ensureConsentTable();
  const query = q.trim();
  const where = {
    ...(tipo ? { source: tipo } : {}),
    ...(query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' as const } },
            { name: { contains: query, mode: 'insensitive' as const } },
            { phone: { contains: query } },
            { reference: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const [records, total] = await Promise.all([
    prisma.consentRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.consentRecord.count({ where }),
  ]);
  const exportHref = `/api/admin/consents/export?${new URLSearchParams({ q: query, tipo }).toString()}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Consentimientos</h1>
          <p className="mt-1 max-w-2xl text-sm text-coffee-600">
            Prueba de quién aceptó los términos, la política de privacidad y las cookies, cuándo, desde dónde y con
            qué versión de los textos. La ley de datos personales (Ley 1581 de 2012) exige poder mostrarla.
          </p>
        </div>
        <a
          href={exportHref}
          className="rounded-lg border border-cream-300 px-4 py-2 text-sm font-medium text-coffee-800 transition-colors hover:bg-cream-100"
        >
          Descargar CSV
        </a>
      </div>

      <form className="mt-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por correo, nombre, celular o pedido"
          className="min-w-0 flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
        />
        <select name="tipo" defaultValue={tipo} className="rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm">
          <option value="">Todos</option>
          {Object.entries(SOURCE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50">Buscar</button>
        {(query || tipo) && (
          <Link href="/admin/consentimientos" className="self-center text-sm text-coffee-600 underline">
            Limpiar
          </Link>
        )}
      </form>

      <p className="mt-4 text-xs text-coffee-500">
        {total} {total === 1 ? 'registro' : 'registros'}
        {total > records.length ? ` · mostrando los ${records.length} más recientes (el CSV los incluye todos)` : ''}
      </p>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-cream-200 bg-cream-50 text-xs uppercase tracking-wide text-coffee-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Términos</th>
              <th className="px-4 py-3 font-medium">Privacidad</th>
              <th className="px-4 py-3 font-medium">Cookies</th>
              <th className="px-4 py-3 font-medium">Versión</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100 text-coffee-800">
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-coffee-500">
                  Aún no hay registros.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.createdAt.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  {SOURCE_LABEL[r.source] ?? r.source}
                  {r.reference && <span className="block text-xs text-coffee-500">{r.reference}</span>}
                </td>
                <td className="px-4 py-3">
                  {r.name || r.email || r.phone ? (
                    <>
                      {r.name && <span className="block">{r.name}</span>}
                      <span className="block text-xs text-coffee-500">{[r.email, r.phone].filter(Boolean).join(' · ')}</span>
                    </>
                  ) : (
                    <span className="text-coffee-400">Visitante anónimo</span>
                  )}
                </td>
                <td className="px-4 py-3">{yes(r.acceptedTerms)}</td>
                <td className="px-4 py-3">{yes(r.acceptedPrivacy)}</td>
                <td className="px-4 py-3">{r.cookies === 'all' ? 'Todas' : r.cookies === 'necessary' ? 'Solo necesarias' : '—'}</td>
                <td className="px-4 py-3 text-xs">{r.legalVersion}</td>
                <td className="px-4 py-3 text-xs text-coffee-500">{r.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
