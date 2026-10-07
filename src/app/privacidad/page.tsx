import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad — AFRA',
  description: 'Cómo AFRA recopila, usa y protege tus datos personales.',
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tightest text-coffee-900">Política de privacidad</h1>
      <p className="mt-3 text-sm text-coffee-500">Última actualización: septiembre de 2026</p>

      <div className="mt-10 space-y-8 text-coffee-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-medium text-coffee-900">1. Datos que recopilamos</h2>
          <p className="mt-2">
            Cuando compras en AFRA o te suscribes a nuestro boletín, recopilamos tu nombre, correo
            electrónico, dirección de envío, ciudad y número de teléfono, únicamente para procesar
            tu pedido y contactarte sobre su estado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">2. Uso de los datos</h2>
          <p className="mt-2">
            Usamos tus datos para: procesar y despachar tu pedido, notificarte por correo sobre el
            estado del pago y el envío, coordinar el pago contra entrega con la transportadora, y,
            si lo autorizaste, enviarte novedades por correo. No vendemos tus datos a terceros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">3. Terceros involucrados</h2>
          <p className="mt-2">
            Compartimos la información estrictamente necesaria con nuestra pasarela de pagos para
            procesar transacciones en línea, y con la transportadora encargada del envío para
            entregar tu pedido. Ambos están obligados a proteger tu información conforme a la ley
            colombiana de protección de datos (Ley 1581 de 2012).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">4. Tus derechos</h2>
          <p className="mt-2">
            Puedes solicitar acceso, corrección o eliminación de tus datos personales, así como
            retirar tu autorización para recibir comunicaciones de marketing, escribiéndonos por
            WhatsApp desde el botón flotante del sitio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-coffee-900">5. Cookies</h2>
          <p className="mt-2">
            Usamos cookies estrictamente necesarias para mantener tu sesión iniciada, recordar el
            contenido de tu carrito y tus favoritos mientras navegas el sitio.
          </p>
        </section>
      </div>
    </div>
  );
}
