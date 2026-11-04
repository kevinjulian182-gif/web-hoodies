import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/LegalPage';
import CookieSettingsButton from '@/components/CookieSettingsButton';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description:
    'Qué cookies usa AFRA, para qué sirven (necesarias, analítica y publicidad) y cómo aceptarlas, rechazarlas o cambiar tu elección.',
  alternates: { canonical: '/cookies' },
};

const SECTIONS = [
  { id: 'que-son', title: 'Qué son las cookies' },
  { id: 'necesarias', title: 'Necesarias' },
  { id: 'analitica', title: 'Analítica' },
  { id: 'publicidad', title: 'Publicidad' },
  { id: 'elegir', title: 'Cómo aceptar, rechazar o cambiar' },
];

const ROW = 'border-b border-cream-200 px-3 py-2.5 align-top';

export default function CookiesPage() {
  let n = 0;
  return (
    <LegalPage
      current="/cookies"
      title="Política de cookies"
      sections={SECTIONS}
      intro={
        <p>
          Usamos algunas cookies para que la tienda funcione y, solo si lo aceptas, otras para entender cómo se usa el
          sitio y medir nuestros anuncios. Tú decides.
        </p>
      }
    >
      <LegalSection id="que-son" n={++n} title="Qué son las cookies">
        <p>
          Son pequeños archivos o datos que el sitio guarda en tu navegador para recordar información entre una página y
          otra, como tu carrito. Aquí incluimos también tecnologías parecidas, como el almacenamiento local del
          navegador y el píxel de Meta.
        </p>
      </LegalSection>

      <LegalSection id="necesarias" n={++n} title="Necesarias">
        <p>Hacen que la tienda funcione y no se pueden desactivar. No se usan para publicidad.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-coffee-500">
              <tr>
                <th className={ROW}>Nombre</th>
                <th className={ROW}>Para qué</th>
                <th className={ROW}>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={ROW}>hoodies-cart</td>
                <td className={ROW}>Guardar los productos de tu carrito.</td>
                <td className={ROW}>Hasta que lo vacíes</td>
              </tr>
              <tr>
                <td className={ROW}>hoodies-wishlist</td>
                <td className={ROW}>Recordar tus favoritos.</td>
                <td className={ROW}>Hasta que los borres</td>
              </tr>
              <tr>
                <td className={ROW}>afra-checkout-v1, afra-wa-customer</td>
                <td className={ROW}>Recordar tus datos de envío para tu próxima compra (sin la cédula).</td>
                <td className={ROW}>Hasta que los borres</td>
              </tr>
              <tr>
                <td className={ROW}>afra-grid-view, afra-pending-purchase</td>
                <td className={ROW}>Recordar cómo prefieres ver el catálogo y completar la confirmación de tu compra.</td>
                <td className={ROW}>Hasta que los borres / la sesión</td>
              </tr>
              <tr>
                <td className={ROW}>afra-cookie-consent</td>
                <td className={ROW}>Recordar si aceptaste o rechazaste las cookies opcionales.</td>
                <td className={ROW}>12 meses</td>
              </tr>
              <tr>
                <td className={ROW}>session</td>
                <td className={ROW}>Mantener la sesión del panel de administración.</td>
                <td className={ROW}>7 días</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="analitica" n={++n} title="Analítica">
        <p>
          Solo si aceptas. Registramos de forma anónima qué páginas se visitan y en qué paso de la compra la gente se
          detiene, para mejorar la tienda. Usamos un identificador aleatorio por visita (afra-sid), que se borra al
          cerrar el navegador; no guardamos tu nombre, correo ni dirección IP en esta medición.
        </p>
      </LegalSection>

      <LegalSection id="publicidad" n={++n} title="Publicidad">
        <p>
          Solo si aceptas. El píxel de Meta (cookies _fbp y fr, de Facebook e Instagram) registra visitas y acciones
          como ver un producto, agregarlo al carrito o comprar, para medir nuestros anuncios y mostrarlos a personas
          interesadas. Meta trata esos datos según su propia política de privacidad.
        </p>
      </LegalSection>

      <LegalSection id="elegir" n={++n} title="Cómo aceptar, rechazar o cambiar">
        <p>
          La primera vez que entras te preguntamos. Puedes cambiar tu elección cuando quieras con el botón de abajo o
          desde el enlace «Configurar cookies» al pie de cualquier página. También puedes borrar las cookies desde la
          configuración de tu navegador.
        </p>
        <CookieSettingsButton className="rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800" />
        <p>
          Más información sobre el uso de tus datos en la <Link href="/privacidad">política de privacidad</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
