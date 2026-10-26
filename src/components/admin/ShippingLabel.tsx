import Logo from '@/components/Logo';
import { formatCOP } from '@/lib/format';

export type LabelSize = 'carta' | 'etiqueta';

export type Sender = { name: string; nit?: string; address?: string; phone?: string; city?: string };

export type LabelData = {
  name: string;
  document: string;
  phone: string;
  address: string;
  complement: string;
  city: string;
  department: string;
  notes: string;
  content: string;
  pieces: string;
  reference: string;
  trackingNumber: string;
  /** Cash on delivery: the carrier collects `amount` (pesos) from the recipient. */
  cod: boolean;
  amount: string;
  declaredValue: string;
  /** Freight collected from the recipient ("al cobro") instead of paid by the store. */
  freightOnDelivery: boolean;
};

const pesos = (value: string) => {
  const n = Number(value.replace(/\D/g, ''));
  return n > 0 ? formatCOP(n * 100) : '';
};

/** The printable shipping label. Sized in millimetres so it prints true to
 * size: a 10×15 cm thermal label, or a half letter page. */
export default function ShippingLabel({ data, sender, size }: { data: LabelData; sender: Sender; size: LabelSize }) {
  const small = size === 'etiqueta';
  const amount = pesos(data.amount);
  const declared = pesos(data.declaredValue);
  const label = small ? 'text-[7pt]' : 'text-[8.5pt]';
  const caption = `${label} font-semibold uppercase tracking-[0.14em] text-coffee-500`;
  const rule = 'border-t-[1.5px] border-coffee-900';

  return (
    <div
      className={`flex flex-col bg-white text-coffee-900 ${
        small ? 'h-[150mm] w-[100mm] p-[5mm] text-[9pt]' : 'min-h-[130mm] w-[190mm] p-[9mm] text-[11pt]'
      } border-[2px] border-coffee-900`}
    >
      <div className="flex items-center justify-between gap-3 pb-[3mm]">
        <Logo className={`${small ? 'h-[5mm]' : 'h-[7mm]'} w-auto text-coffee-900`} />
        <div className="text-right">
          <p className={caption}>Guía de envío</p>
          {data.reference && <p className={`${label} font-mono text-coffee-700`}>{data.reference}</p>}
        </div>
      </div>

      <div className={`${rule} grid ${small ? 'grid-cols-1 gap-[2mm]' : 'grid-cols-[1fr_1.6fr] gap-[6mm]'} py-[3mm]`}>
        <div className="min-w-0">
          <p className={caption}>Remite</p>
          <p className="font-semibold leading-tight">{sender.name}</p>
          <p className={`${label} leading-snug text-coffee-700`}>
            {[sender.nit && `NIT ${sender.nit}`, sender.phone, sender.address].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="min-w-0">
          <p className={caption}>Destinatario</p>
          <p className={`${small ? 'text-[13pt]' : 'text-[17pt]'} font-bold leading-tight break-words`}>
            {data.name || 'Nombre del destinatario'}
          </p>
          <p className="leading-snug">
            {data.document && <>C.C. {data.document} · </>}Tel {data.phone || '—'}
          </p>
        </div>
      </div>

      <div className={`${rule} py-[3mm]`}>
        <p className={caption}>Dirección de entrega</p>
        <p className={`${small ? 'text-[12pt]' : 'text-[16pt]'} font-bold leading-snug break-words`}>
          {data.address || 'Dirección'}
          {data.complement && `, ${data.complement}`}
        </p>
        <p className={`${small ? 'text-[11pt]' : 'text-[14pt]'} font-semibold uppercase leading-snug`}>
          {data.city || 'Ciudad'}
          {data.department && ` — ${data.department}`}
        </p>
        {data.notes && <p className={`${label} mt-[1.5mm] leading-snug text-coffee-700`}>Indicaciones: {data.notes}</p>}
      </div>

      <div className={`${rule} grid grid-cols-2 gap-[3mm] py-[3mm]`}>
        <div className="min-w-0">
          <p className={caption}>Contenido</p>
          <p className="leading-snug break-words">{data.content || 'Prendas de vestir'}</p>
          <p className={`${label} text-coffee-700`}>
            {data.pieces ? `${data.pieces} pieza(s)` : ''}
            {declared && `${data.pieces ? ' · ' : ''}Valor declarado ${declared}`}
          </p>
        </div>
        <div className="min-w-0">
          <p className={caption}>Guía transportadora</p>
          <p className="font-mono font-semibold leading-snug break-all">{data.trackingNumber || '________________'}</p>
        </div>
      </div>

      <div
        className={`mt-auto rounded-[1.5mm] border-[2px] border-coffee-900 px-[3mm] py-[2.5mm] text-center ${
          data.cod ? 'bg-coffee-900 text-white' : ''
        }`}
      >
        {data.cod ? (
          <>
            <p className={`${label} font-semibold uppercase tracking-[0.14em] opacity-80`}>Pago contra entrega · cobrar</p>
            <p className={`${small ? 'text-[16pt]' : 'text-[22pt]'} font-bold leading-tight`}>
              {amount || '$ —'}
              {data.freightOnDelivery && <span className={`${small ? 'text-[10pt]' : 'text-[13pt]'} font-semibold`}> + flete</span>}
            </p>
          </>
        ) : (
          <p className={`${small ? 'text-[12pt]' : 'text-[15pt]'} font-bold uppercase tracking-[0.08em]`}>
            {data.freightOnDelivery ? 'Producto pagado · cobrar solo flete' : 'Pagado · no cobrar'}
          </p>
        )}
        <p className={`${label} mt-[1mm] font-semibold uppercase tracking-[0.14em] ${data.cod ? 'opacity-80' : 'text-coffee-700'}`}>
          Flete: {data.freightOnDelivery ? 'al cobro (lo paga el destinatario)' : 'pagado por el remitente'}
        </p>
      </div>
    </div>
  );
}
