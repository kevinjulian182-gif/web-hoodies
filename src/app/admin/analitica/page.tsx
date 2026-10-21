import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureAnalyticsTable } from '@/lib/analyticsServer';
import { formatCOP } from '@/lib/format';

export const dynamic = 'force-dynamic';

const RANGES = [7, 30, 90];

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const days = RANGES.includes(Number(dias)) ? Number(dias) : 30;
  const since = new Date(Date.now() - days * 864e5);
  await ensureAnalyticsTable();

  const [funnelRows, deviceRows, productRows, errorRows, exitRows, revenueRows] = await Promise.all([
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT "sessionId") AS visits,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'view_product') AS viewed,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'add_to_cart') AS added,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name IN ('begin_checkout', 'checkout_step')) AS checkout,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'checkout_step' AND step >= 2) AS shipping,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'checkout_step' AND step >= 3) AS payment,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'purchase') AS purchased,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'whatsapp_order') AS whatsapp
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${since}`),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT device,
        COUNT(DISTINCT "sessionId") AS visits,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'add_to_cart') AS added,
        COUNT(DISTINCT "sessionId") FILTER (WHERE name = 'purchase') AS purchased
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${since}
      GROUP BY device ORDER BY visits DESC`),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT e."productId" AS id, p.name, p.brand,
        COUNT(DISTINCT e."sessionId") FILTER (WHERE e.name = 'view_product') AS views,
        COUNT(DISTINCT e."sessionId") FILTER (WHERE e.name = 'add_to_cart') AS adds
      FROM "AnalyticsEvent" e JOIN "Product" p ON p.id = e."productId"
      WHERE e."createdAt" >= ${since} AND e.name IN ('view_product', 'add_to_cart')
      GROUP BY e."productId", p.name, p.brand ORDER BY views DESC LIMIT 10`),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT step, detail, COUNT(*) AS times
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} AND name = 'checkout_error'
      GROUP BY step, detail ORDER BY times DESC LIMIT 8`),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT path, COUNT(*) AS sessions FROM (
        SELECT DISTINCT ON ("sessionId") "sessionId", path
        FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${since} AND name = 'page_view'
          AND "sessionId" NOT IN (SELECT "sessionId" FROM "AnalyticsEvent" WHERE name IN ('purchase', 'whatsapp_order') AND "createdAt" >= ${since})
        ORDER BY "sessionId", "createdAt" DESC
      ) last GROUP BY path ORDER BY sessions DESC LIMIT 8`),
    prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT COALESCE(SUM(value), 0) AS revenue FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${since} AND name = 'purchase'`),
  ]);

  const f = funnelRows[0] ?? {};
  const steps = [
    { label: 'Visitaron la tienda', value: num(f.visits) },
    { label: 'Vieron un producto', value: num(f.viewed) },
    { label: 'Agregaron al carrito', value: num(f.added) },
    { label: 'Empezaron el pago (datos)', value: num(f.checkout) },
    { label: 'Llegaron a la entrega', value: num(f.shipping) },
    { label: 'Llegaron al pago', value: num(f.payment) },
    { label: 'Compraron', value: num(f.purchased) },
  ];
  // The biggest leak: the step that loses the largest share of the previous one.
  let worst = -1;
  let worstLoss = 0;
  steps.forEach((s, i) => {
    if (i === 0 || steps[i - 1].value === 0) return;
    const loss = 1 - s.value / steps[i - 1].value;
    if (loss > worstLoss) {
      worstLoss = loss;
      worst = i;
    }
  });
  const top = steps[0].value;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Analítica de la tienda</h1>
          <p className="mt-1 max-w-xl text-sm text-coffee-600">
            Dónde se quedan los clientes entre que entran y compran. Cuenta visitas anónimas de personas que aceptaron
            cookies de analítica.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-cream-100 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analitica?dias=${r}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${r === days ? 'bg-white font-medium text-coffee-900 shadow-sm' : 'text-coffee-600'}`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {top === 0 ? (
        <div className="mt-8 rounded-2xl border border-cream-200 bg-white p-8 text-center text-sm text-coffee-600">
          Aún no hay datos en este periodo. Se empiezan a registrar desde ahora, cuando los visitantes acepten las cookies.
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-cream-200 bg-white p-5">
            <h2 className="text-base font-semibold text-coffee-900">Embudo de compra</h2>
            {worst > 0 && (
              <p className="mt-1 text-sm text-red-700">
                Mayor abandono: entre «{steps[worst - 1].label.toLowerCase()}» y «{steps[worst].label.toLowerCase()}» se
                pierde el {Math.round(worstLoss * 100)}%.
              </p>
            )}
            <ol className="mt-5 space-y-3">
              {steps.map((s, i) => {
                const prev = i > 0 ? steps[i - 1].value : s.value;
                return (
                  <li key={s.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={i === worst ? 'font-semibold text-red-700' : 'text-coffee-800'}>{s.label}</span>
                      <span className="tabular-nums text-coffee-900">
                        <strong>{s.value}</strong>
                        <span className="ml-2 text-xs text-coffee-500">
                          {pct(s.value, top)}% del total{i > 0 ? ` · ${pct(s.value, prev)}% del paso anterior` : ''}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cream-100">
                      <div
                        className={`h-full rounded-full ${i === worst ? 'bg-red-600' : 'bg-coffee-800'}`}
                        style={{ width: `${Math.max(pct(s.value, top), s.value > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs text-coffee-500">
              Además, {num(f.whatsapp)} visitas hicieron su pedido por WhatsApp. Ventas registradas:{' '}
              {formatCOP(num(revenueRows[0]?.revenue) * 100)}.
            </p>
          </section>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-cream-200 bg-white p-5">
              <h2 className="text-base font-semibold text-coffee-900">Celular vs. computador</h2>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-coffee-500">
                  <tr>
                    <th className="py-1.5 font-medium">Dispositivo</th>
                    <th className="py-1.5 font-medium">Visitas</th>
                    <th className="py-1.5 font-medium">Carrito</th>
                    <th className="py-1.5 font-medium">Compra</th>
                  </tr>
                </thead>
                <tbody className="text-coffee-800">
                  {deviceRows.map((d) => (
                    <tr key={String(d.device)} className="border-t border-cream-100">
                      <td className="py-2">{d.device === 'mobile' ? 'Celular' : 'Computador'}</td>
                      <td className="py-2 tabular-nums">{num(d.visits)}</td>
                      <td className="py-2 tabular-nums">{pct(num(d.added), num(d.visits))}%</td>
                      <td className="py-2 tabular-nums">{pct(num(d.purchased), num(d.visits))}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white p-5">
              <h2 className="text-base font-semibold text-coffee-900">Dónde se van sin comprar</h2>
              <p className="mt-1 text-xs text-coffee-500">Última página vista por las visitas que no compraron.</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {exitRows.map((r) => (
                  <li key={String(r.path)} className="flex justify-between gap-3">
                    <span className="truncate text-coffee-800">{String(r.path || '/')}</span>
                    <span className="tabular-nums text-coffee-900">{num(r.sessions)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-cream-200 bg-white p-5">
            <h2 className="text-base font-semibold text-coffee-900">Productos: los miran pero ¿los agregan?</h2>
            <p className="mt-1 text-xs text-coffee-500">
              Un producto con muchas visitas y pocas agregadas al carrito puede tener un problema de precio, fotos o
              tallas disponibles.
            </p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-coffee-500">
                <tr>
                  <th className="py-1.5 font-medium">Producto</th>
                  <th className="py-1.5 font-medium">Vistas</th>
                  <th className="py-1.5 font-medium">Al carrito</th>
                </tr>
              </thead>
              <tbody className="text-coffee-800">
                {productRows.map((p) => (
                  <tr key={String(p.id)} className="border-t border-cream-100">
                    <td className="py-2">
                      {String(p.brand)} {String(p.name)}
                    </td>
                    <td className="py-2 tabular-nums">{num(p.views)}</td>
                    <td className="py-2 tabular-nums">
                      {num(p.adds)} <span className="text-xs text-coffee-500">({pct(num(p.adds), num(p.views))}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-6 rounded-2xl border border-cream-200 bg-white p-5">
            <h2 className="text-base font-semibold text-coffee-900">Errores en el pago</h2>
            <p className="mt-1 text-xs text-coffee-500">Lo que más frena a la gente al llenar el formulario o al pagar.</p>
            {errorRows.length === 0 ? (
              <p className="mt-3 text-sm text-coffee-600">Sin errores registrados.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {errorRows.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-coffee-800">
                      Paso {num(e.step)} · {String(e.detail ?? '')}
                    </span>
                    <span className="tabular-nums text-coffee-900">{num(e.times)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
