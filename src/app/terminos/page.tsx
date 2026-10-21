import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalIdentity } from '@/components/LegalPage';
import { getSiteContent, getLegalInfo, getFreeShippingThresholdCents, getShippingRates } from '@/lib/content';
import { minShippingCents } from '@/lib/pricing';
import { formatCOP } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Términos y condiciones de compra',
  description:
    'Condiciones de compra en AFRA: precios, medios de pago, envíos a toda Colombia con Interrapidísimo, pago contra entrega, garantía y propiedad intelectual.',
  alternates: { canonical: '/terminos' },
};

const SECTIONS = [
  { id: 'identificacion', title: 'Quiénes somos' },
  { id: 'aceptacion', title: 'Aceptación de estos términos' },
  { id: 'productos', title: 'Productos, precios y disponibilidad' },
  { id: 'compra', title: 'Cómo se hace una compra' },
  { id: 'pagos', title: 'Medios de pago' },
  { id: 'envios', title: 'Envíos y entregas' },
  { id: 'contra-entrega', title: 'Pago contra entrega' },
  { id: 'cambios', title: 'Cambios, retracto y garantía' },
  { id: 'propiedad-intelectual', title: 'Propiedad intelectual e imágenes' },
  { id: 'uso', title: 'Uso del sitio' },
  { id: 'datos', title: 'Datos personales y cookies' },
  { id: 'pqr', title: 'Peticiones, quejas y reclamos' },
  { id: 'ley', title: 'Ley aplicable y cambios' },
];

export default async function TerminosPage() {
  const content = await getSiteContent();
  const legal = getLegalInfo(content);
  const threshold = getFreeShippingThresholdCents(content);
  const fromCents = minShippingCents(getShippingRates(content));
  let n = 0;

  return (
    <LegalPage
      current="/terminos"
      title="Términos y condiciones"
      sections={SECTIONS}
      intro={
        <p>
          Estas son las reglas de las compras en wearafra.com. Las escribimos claras y cortas: qué compras, cuánto
          pagas, cuándo te llega y qué puedes hacer si algo no sale bien. Se rigen por el Estatuto del Consumidor
          (Ley 1480 de 2011).
        </p>
      }
    >
      <LegalSection id="identificacion" n={++n} title="Quiénes somos">
        <p>AFRA es una tienda en línea de streetwear que vende y despacha en Colombia.</p>
        <LegalIdentity info={legal} />
      </LegalSection>

      <LegalSection id="aceptacion" n={++n} title="Aceptación de estos términos">
        <p>
          Al hacer un pedido marcas que leíste y aceptas estos términos y la{' '}
          <Link href="/privacidad">política de privacidad</Link>. Guardamos registro de esa aceptación (fecha, hora y
          versión del texto) como prueba, según exige la ley.
        </p>
      </LegalSection>

      <LegalSection id="productos" n={++n} title="Productos, precios y disponibilidad">
        <ul>
          <li>Los precios están en pesos colombianos (COP) e incluyen los impuestos aplicables.</li>
          <li>El costo del envío se muestra aparte antes de pagar, y el total final aparece antes de confirmar.</li>
          <li>
            Las unidades se apartan cuando haces el pedido. Si por un error un producto no está disponible, te
            avisamos y te devolvemos el 100% de lo pagado o te ofrecemos un cambio, como prefieras.
          </li>
          <li>
            Las fotos muestran el producto real; los colores pueden variar levemente según la pantalla. Las medidas de
            la guía de tallas son aproximadas.
          </li>
          <li>Si un precio aparece con un error evidente, te contactamos antes de despachar para que decidas.</li>
        </ul>
      </LegalSection>

      <LegalSection id="compra" n={++n} title="Cómo se hace una compra">
        <ul>
          <li>Eliges productos, talla y color, y los agregas al carrito.</li>
          <li>Escribes tus datos de contacto y de envío, eliges cómo pagar y revisas el total.</li>
          <li>
            Al confirmar recibes un correo con el resumen del pedido. El contrato de compra queda celebrado cuando el
            pedido es confirmado (contra entrega) o cuando el pago es aprobado (en línea).
          </li>
          <li>También puedes pedir por WhatsApp; en ese caso confirmamos los detalles en el chat.</li>
        </ul>
      </LegalSection>

      <LegalSection id="pagos" n={++n} title="Medios de pago">
        <ul>
          <li>
            <strong>En línea con Wompi:</strong> tarjeta débito o crédito, PSE, Nequi y Bancolombia. AFRA no ve ni
            guarda los datos de tu tarjeta.
          </li>
          <li>
            <strong>Contra entrega:</strong> pagas en efectivo o datáfono cuando recibes el pedido.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="envios" n={++n} title="Envíos y entregas">
        <ul>
          <li>Enviamos a toda Colombia con Interrapidísimo. Despachamos dentro de las 24 horas hábiles siguientes.</li>
          <li>
            El tiempo de entrega suele ser de 1 a 5 días hábiles según la ciudad; en zonas de difícil acceso puede ser
            mayor.
          </li>
          <li>
            El costo depende del destino{fromCents > 0 ? ` (desde ${formatCOP(fromCents)})` : ''} y se calcula antes de
            pagar.{threshold > 0 ? ` Si tu pedido supera ${formatCOP(threshold)}, el envío es gratis.` : ''}
          </li>
          <li>Te enviamos el número de guía por correo apenas despachamos, para que sigas el paquete.</li>
          <li>
            Revisa el paquete al recibirlo. Si llega abierto o dañado, déjalo anotado con el transportador y
            escríbenos el mismo día.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="contra-entrega" n={++n} title="Pago contra entrega">
        <p>
          Al elegir pago contra entrega te comprometes a recibir y pagar el pedido. Si un pedido se devuelve sin una
          razón válida (dirección incorrecta, no contestar, rechazarlo sin causa), podemos pedir pago anticipado en
          compras futuras.
        </p>
      </LegalSection>

      <LegalSection id="cambios" n={++n} title="Cambios, retracto y garantía">
        <p>
          Tienes derecho de retracto, reversión del pago y garantía legal. Los plazos y el paso a paso están en la{' '}
          <Link href="/reembolsos">política de cambios y reembolsos</Link>.
        </p>
      </LegalSection>

      <LegalSection id="propiedad-intelectual" n={++n} title="Propiedad intelectual e imágenes">
        <ul>
          <li>
            Las fotografías, videos, textos, diseño del sitio y la marca y logo AFRA son propiedad de {legal.name} o
            se usan con autorización de su titular. © {new Date().getFullYear()} {legal.name}. Todos los derechos
            reservados.
          </li>
          <li>
            No está permitido copiar, descargar para uso comercial, modificar ni publicar nuestras fotos o textos sin
            autorización escrita. Para pedir permiso escríbenos{legal.email ? ` a ${legal.email}` : ''}.
          </li>
          <li>
            Las marcas de los productos que vendemos (por ejemplo Nike, Adidas o BAPE) y sus logos pertenecen a sus
            respectivos titulares. Las mencionamos solo para identificar los productos; AFRA no está afiliada ni
            patrocinada por esas marcas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="uso" n={++n} title="Uso del sitio">
        <p>
          Te comprometes a dar datos reales y a no usar el sitio para fines fraudulentos. Podemos cancelar pedidos con
          indicios de fraude, avisándote y devolviendo lo pagado.
        </p>
      </LegalSection>

      <LegalSection id="datos" n={++n} title="Datos personales y cookies">
        <p>
          Tratamos tus datos según la <Link href="/privacidad">política de tratamiento de datos personales</Link> (Ley
          1581 de 2012). El uso de cookies está explicado en la <Link href="/cookies">política de cookies</Link>.
        </p>
      </LegalSection>

      <LegalSection id="pqr" n={++n} title="Peticiones, quejas y reclamos">
        <p>
          Escríbenos por WhatsApp{legal.email ? ` o a ${legal.email}` : ''} con tu número de pedido. Respondemos
          peticiones, quejas y reclamos en máximo 15 días hábiles. Si no quedas satisfecho, puedes acudir a la
          Superintendencia de Industria y Comercio (www.sic.gov.co).
        </p>
      </LegalSection>

      <LegalSection id="ley" n={++n} title="Ley aplicable y cambios">
        <p>
          Estos términos se rigen por las leyes de la República de Colombia. Si los cambiamos, publicamos la nueva
          versión con su fecha; tu compra se rige por la versión vigente el día en que la hiciste.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
