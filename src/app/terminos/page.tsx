import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones — AFRA',
  description: 'Condiciones de compra, envío, pago contra entrega y devoluciones en AFRA.',
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tightest text-coffee-900">Términos y condiciones</h1>
      <p className="mt-3 text-sm text-coffee-500">Última actualización: septiembre de 2026</p>

      <div className="mt-10 space-y-8 text-coffee-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-medium text-coffee-900">1. Sobre AFRA</h2>
          <p className="mt-2">
            AFRA es una tienda en línea de streetwear que opera en Colombia. Al comprar en este
            sitio aceptas los términos descritos a continuación.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">2. Productos y disponibilidad</h2>
          <p className="mt-2">
            Los precios se muestran en pesos colombianos (COP) e incluyen los impuestos aplicables.
            El stock mostrado en el catálogo se actualiza en tiempo real; si un producto se agota
            entre la compra y el despacho, te contactaremos para ofrecerte un cambio o un reembolso
            completo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">3. Pago contra entrega</h2>
          <p className="mt-2">
            Puedes elegir pagar contra entrega en efectivo o con datáfono al momento de recibir tu
            pedido, o pagar en línea de forma anticipada a través de nuestra pasarela de pagos. En
            ambos casos puedes revisar el estado de la prenda antes de completar el pago cuando la
            recibas de manos del transportador.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">4. Envíos</h2>
          <p className="mt-2">
            Realizamos envíos a toda Colombia a través de transportadoras aliadas. Los tiempos de
            entrega estimados son de 2 a 5 días hábiles según la ciudad de destino. Recibirás el
            número de guía de tu pedido por correo electrónico una vez sea despachado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">5. Cambios y devoluciones</h2>
          <p className="mt-2">
            Conforme al derecho de retracto del Estatuto del Consumidor (Ley 1480 de 2012), tienes
            hasta 5 días hábiles después de recibir tu pedido para solicitar un cambio o devolución,
            siempre que la prenda conserve sus etiquetas originales y no haya sido usada. Escríbenos
            por WhatsApp para iniciar el proceso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">6. Autenticidad</h2>
          <p className="mt-2">
            Todas las prendas que vendemos son piezas originales de las marcas que representamos. No
            comercializamos réplicas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">7. Contacto</h2>
          <p className="mt-2">
            Para dudas sobre un pedido, cambios o devoluciones, contáctanos por WhatsApp desde el
            botón flotante en cualquier página del sitio.
          </p>
        </section>
      </div>
    </div>
  );
}
