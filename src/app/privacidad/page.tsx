import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalIdentity } from '@/components/LegalPage';
import { getSiteContent, getLegalInfo } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Política de privacidad y tratamiento de datos',
  description:
    'Cómo AFRA recoge, usa y protege tus datos personales según la Ley 1581 de 2012: finalidades, tus derechos y cómo ejercerlos.',
  alternates: { canonical: '/privacidad' },
};

const SECTIONS = [
  { id: 'responsable', title: 'Responsable del tratamiento' },
  { id: 'datos', title: 'Qué datos recogemos' },
  { id: 'finalidades', title: 'Para qué los usamos' },
  { id: 'autorizacion', title: 'Tu autorización' },
  { id: 'terceros', title: 'Con quién los compartimos' },
  { id: 'derechos', title: 'Tus derechos' },
  { id: 'procedimiento', title: 'Cómo ejercer tus derechos' },
  { id: 'seguridad', title: 'Seguridad y conservación' },
  { id: 'menores', title: 'Menores de edad' },
  { id: 'vigencia', title: 'Vigencia y cambios' },
];

export default async function PrivacidadPage() {
  const legal = getLegalInfo(await getSiteContent());
  const contact = legal.email ? `al correo ${legal.email}` : 'por WhatsApp';
  let n = 0;

  return (
    <LegalPage
      current="/privacidad"
      title="Política de tratamiento de datos personales"
      sections={SECTIONS}
      intro={
        <p>
          Esta política explica qué datos tuyos usamos, para qué y cómo puedes conocerlos, corregirlos o pedir que los
          borremos. Cumple la Ley 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).
        </p>
      }
    >
      <LegalSection id="responsable" n={++n} title="Responsable del tratamiento">
        <LegalIdentity info={legal} />
      </LegalSection>

      <LegalSection id="datos" n={++n} title="Qué datos recogemos">
        <ul>
          <li>
            <strong>Identificación y contacto:</strong> nombre, número de cédula, correo y celular.
          </li>
          <li>
            <strong>Envío:</strong> dirección, ciudad, departamento e indicaciones para la entrega.
          </li>
          <li>
            <strong>Compra:</strong> productos, valores, medio de pago elegido y estado del pedido. Los datos de tu
            tarjeta los procesa Wompi; AFRA no los ve ni los guarda.
          </li>
          <li>
            <strong>Navegación:</strong> dirección IP, tipo de navegador y, solo si lo aceptas, cookies de analítica y
            publicidad (ver la <Link href="/cookies">política de cookies</Link>).
          </li>
        </ul>
        <p>No pedimos datos sensibles (salud, origen étnico, opiniones políticas, biométricos).</p>
      </LegalSection>

      <LegalSection id="finalidades" n={++n} title="Para qué los usamos">
        <ul>
          <li>Procesar, despachar y entregar tus pedidos, y cobrar los pagos.</li>
          <li>Enviarte la confirmación del pedido, el número de guía y avisos sobre tu compra por correo o WhatsApp.</li>
          <li>Atender cambios, devoluciones, garantías y peticiones, quejas o reclamos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
          <li>Prevenir fraudes en los pagos.</li>
          <li>Medir el uso del sitio para mejorarlo (solo con tu aceptación de cookies de analítica).</li>
          <li>
            Enviarte novedades y promociones, solo si te suscribiste. Puedes darte de baja cuando quieras desde el
            mismo correo o escribiéndonos.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="autorizacion" n={++n} title="Tu autorización">
        <p>
          Antes de enviarnos tus datos (al comprar, pedir por WhatsApp o suscribirte) te pedimos marcar que autorizas
          su tratamiento según esta política. Guardamos prueba de esa autorización: fecha, hora, versión del texto y
          dirección IP. Puedes revocarla en cualquier momento, salvo cuando tengamos un deber legal o contractual de
          conservar los datos (por ejemplo, la factura de una compra).
        </p>
      </LegalSection>

      <LegalSection id="terceros" n={++n} title="Con quién los compartimos">
        <p>Solo con los proveedores que necesitamos para operar, que actúan como encargados del tratamiento:</p>
        <ul>
          <li>
            <strong>Interrapidísimo</strong> (transportadora): nombre, celular, cédula y dirección para entregar.
          </li>
          <li>
            <strong>Wompi</strong> (pasarela de pagos): datos necesarios para procesar el pago.
          </li>
          <li>
            <strong>Servicios de alojamiento, base de datos y correo</strong> (como Vercel, Supabase y Resend), que
            pueden almacenar la información fuera de Colombia, en países con medidas de protección adecuadas.
          </li>
          <li>
            <strong>Meta</strong> (Facebook e Instagram): datos de navegación para medir anuncios, solo si aceptas las
            cookies de publicidad.
          </li>
        </ul>
        <p>No vendemos ni alquilamos tus datos.</p>
      </LegalSection>

      <LegalSection id="derechos" n={++n} title="Tus derechos">
        <p>Como titular de los datos tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste.</li>
          <li>Saber qué uso le hemos dado a tus datos.</li>
          <li>Revocar la autorización o pedir que suprimamos tus datos, cuando no haya un deber legal de conservarlos.</li>
          <li>Acceder gratis a tus datos.</li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y Comercio (www.sic.gov.co) si consideras que
            incumplimos la ley, después de haber hecho tu reclamo con nosotros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="procedimiento" n={++n} title="Cómo ejercer tus derechos">
        <p>
          Escríbenos {contact} indicando tu nombre, cédula, lo que solicitas y un medio para responderte.
        </p>
        <ul>
          <li>
            <strong>Consultas</strong> (saber qué datos tenemos): respondemos en máximo 10 días hábiles, prorrogables 5
            días hábiles más avisándote el motivo.
          </li>
          <li>
            <strong>Reclamos</strong> (corregir, actualizar, suprimir o revocar): respondemos en máximo 15 días hábiles,
            prorrogables 8 días hábiles más avisándote el motivo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="seguridad" n={++n} title="Seguridad y conservación">
        <p>
          Protegemos los datos con conexión cifrada (HTTPS), accesos restringidos al personal autorizado y credenciales
          cifradas. Conservamos los datos de las compras mientras sean necesarios para las finalidades descritas y por
          el tiempo que exigen las normas contables y tributarias (hasta 10 años). Los datos del newsletter se
          conservan hasta que te des de baja.
        </p>
      </LegalSection>

      <LegalSection id="menores" n={++n} title="Menores de edad">
        <p>
          La tienda está dirigida a mayores de edad. Si eres menor, tu madre, padre o representante legal debe hacer la
          compra o autorizarla.
        </p>
      </LegalSection>

      <LegalSection id="vigencia" n={++n} title="Vigencia y cambios">
        <p>
          Esta política rige desde su fecha de publicación. Si hacemos cambios importantes los publicaremos aquí con la
          nueva fecha y, si afectan el uso de tus datos, te pediremos de nuevo tu autorización. Lee también los{' '}
          <Link href="/terminos">términos y condiciones</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
