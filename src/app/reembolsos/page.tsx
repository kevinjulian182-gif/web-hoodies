import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalIdentity } from '@/components/LegalPage';
import { getSiteContent, getLegalInfo } from '@/lib/content';
import { RETURN_POLICY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Cambios, devoluciones y reembolsos',
  description:
    'Cambios de talla en 15 días, derecho de retracto de 5 días hábiles, reversión del pago y garantía legal en AFRA. Paso a paso y plazos de reembolso.',
  alternates: { canonical: '/reembolsos' },
};

const SECTIONS = [
  { id: 'resumen', title: 'Resumen rápido' },
  { id: 'cambios', title: 'Cambios de talla o color' },
  { id: 'retracto', title: 'Derecho de retracto (devolución)' },
  { id: 'reversion', title: 'Reversión del pago' },
  { id: 'garantia', title: 'Garantía legal' },
  { id: 'condiciones', title: 'Condiciones del producto' },
  { id: 'como', title: 'Cómo solicitarlo' },
  { id: 'reembolso', title: 'Cómo y cuándo te devolvemos el dinero' },
  { id: 'excepciones', title: 'Qué no aplica' },
];

export default async function ReembolsosPage() {
  const legal = getLegalInfo(await getSiteContent());
  const { exchangeDays, withdrawalBusinessDays, refundMaxDays } = RETURN_POLICY;
  let n = 0;

  return (
    <LegalPage
      current="/reembolsos"
      title="Cambios y reembolsos"
      sections={SECTIONS}
      intro={
        <p>
          Queremos que tu prenda te quede perfecta. Si no es así, aquí está todo lo que puedes hacer, con los plazos
          que establece el Estatuto del Consumidor (Ley 1480 de 2011).
        </p>
      }
    >
      <LegalSection id="resumen" n={++n} title="Resumen rápido">
        <ul>
          <li>
            <strong>Cambio de talla o color:</strong> hasta {exchangeDays} días calendario después de recibir.
          </li>
          <li>
            <strong>Devolución con reembolso (retracto):</strong> hasta {withdrawalBusinessDays} días hábiles después de
            recibir.
          </li>
          <li>
            <strong>Producto defectuoso:</strong> garantía legal de 1 año por defectos de fabricación.
          </li>
          <li>
            <strong>Reembolso:</strong> en máximo {refundMaxDays} días calendario, por el mismo medio de pago o por
            transferencia.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cambios" n={++n} title="Cambios de talla o color">
        <p>
          Puedes cambiar tu prenda por otra talla o color del mismo producto, o por otro producto de igual o mayor
          valor pagando la diferencia, dentro de los {exchangeDays} días calendario siguientes a la entrega, sujeto a
          disponibilidad. El envío de vuelta y el nuevo envío los asume el cliente, salvo que el error haya sido
          nuestro (talla o producto equivocado), en cuyo caso corren por cuenta de AFRA.
        </p>
      </LegalSection>

      <LegalSection id="retracto" n={++n} title="Derecho de retracto (devolución)">
        <p>
          Como compraste a distancia, tienes derecho a retractarte de la compra dentro de los{' '}
          {withdrawalBusinessDays} días hábiles siguientes a la entrega, sin tener que explicar el motivo (artículo 47
          de la Ley 1480 de 2011). Te devolvemos todo lo que pagaste por el producto, sin descuentos ni retenciones.
        </p>
        <p>
          El producto debe devolverse en las mismas condiciones en que lo recibiste. Los costos de transporte de la
          devolución corren por tu cuenta, como establece la ley.
        </p>
      </LegalSection>

      <LegalSection id="reversion" n={++n} title="Reversión del pago">
        <p>
          Si pagaste en línea (tarjeta, PSE u otro medio electrónico) puedes pedir la reversión del pago dentro de los
          5 días hábiles siguientes a cuando supiste de alguna de estas situaciones (artículo 51 de la Ley 1480 de 2011
          y Decreto 1074 de 2015):
        </p>
        <ul>
          <li>Fuiste víctima de fraude o de una operación que no hiciste.</li>
          <li>El producto no te llegó.</li>
          <li>El producto no corresponde a lo que pediste o es defectuoso.</li>
        </ul>
        <p>
          Debes avisarnos a nosotros y a la entidad emisora de tu medio de pago (tu banco), y devolver el producto si
          lo recibiste.
        </p>
      </LegalSection>

      <LegalSection id="garantia" n={++n} title="Garantía legal">
        <p>
          Respondemos por la calidad e idoneidad de los productos. Si una prenda presenta un defecto de fabricación
          (costuras que se sueltan, cremalleras o estampados defectuosos de origen), tienes 1 año desde la entrega para
          reclamar. Primero revisamos el producto; según el caso lo reparamos, lo cambiamos o te devolvemos el dinero.
          Los envíos de una garantía aprobada corren por cuenta de AFRA.
        </p>
        <p>La garantía no cubre el desgaste normal, el mal uso, el lavado o secado inadecuado, ni modificaciones.</p>
      </LegalSection>

      <LegalSection id="condiciones" n={++n} title="Condiciones del producto">
        <ul>
          <li>Sin uso, sin lavar, sin olores y con sus etiquetas originales.</li>
          <li>En su empaque original o uno que lo proteja igual.</li>
          <li>Con todos los accesorios con los que llegó.</li>
        </ul>
      </LegalSection>

      <LegalSection id="como" n={++n} title="Cómo solicitarlo">
        <ul>
          <li>
            Escríbenos por WhatsApp{legal.email ? ` o a ${legal.email}` : ''} con tu número de pedido, qué quieres
            hacer (cambio, devolución o garantía) y una foto del producto.
          </li>
          <li>Te respondemos con la dirección y las indicaciones para el envío.</li>
          <li>Cuando recibimos y revisamos el producto (2 días hábiles), procesamos el cambio o el reembolso.</li>
        </ul>
        <LegalIdentity info={legal} />
      </LegalSection>

      <LegalSection id="reembolso" n={++n} title="Cómo y cuándo te devolvemos el dinero">
        <ul>
          <li>
            <strong>Pagos en línea:</strong> reversamos el cobro al mismo medio de pago. Según tu banco, el dinero puede
            tardar unos días hábiles más en verse.
          </li>
          <li>
            <strong>Contra entrega:</strong> transferencia a tu cuenta bancaria o Nequi a nombre del titular del pedido.
          </li>
          <li>El plazo máximo es de {refundMaxDays} días calendario desde que aceptamos la devolución.</li>
          <li>
            El costo del envío original se reembolsa solo cuando el producto llegó defectuoso o equivocado, o en un
            retracto.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="excepciones" n={++n} title="Qué no aplica">
        <ul>
          <li>Productos usados, lavados, dañados por el cliente o sin etiquetas.</li>
          <li>Medias, ropa interior y productos de uso íntimo, por higiene (salvo defecto de fabricación).</li>
          <li>Productos personalizados o hechos a la medida.</li>
          <li>Solicitudes fuera de los plazos de esta política (la garantía por defectos sigue aplicando).</li>
        </ul>
        <p>
          Nada de esta política limita los derechos que te da la ley. Más detalles en los{' '}
          <Link href="/terminos">términos y condiciones</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
