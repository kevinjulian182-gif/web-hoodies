// Shared by the Cuentas page and its APIs (client-safe: no Prisma).

export const EXPENSE_CATEGORIES = [
  'Envíos',
  'Publicidad y redes',
  'Empaque y etiquetas',
  'Comisiones (Wompi, plataformas)',
  'Arriendo y servicios',
  'Nómina y servicios profesionales',
  'Impuestos',
  'Devoluciones y garantías',
  'Retiro del dueño',
  'Reembolso a socio',
  'Pago de préstamo',
  'Otros gastos',
] as const;

export const INCOME_CATEGORIES = ['Venta por fuera de la tienda', 'Aporte del dueño', 'Préstamo recibido', 'Otros ingresos'] as const;

/** Money that moves cash but isn't a business result (it doesn't count as
 * profit or loss): what the owner puts in or takes out, and loans. */
export const CASH_ONLY_CATEGORIES = new Set<string>([
  'Retiro del dueño',
  'Reembolso a socio',
  'Pago de préstamo',
  'Aporte del dueño',
  'Préstamo recibido',
]);

/** "Who paid" for what the store paid with its own money. Anything paid by
 * someone else (a partner, out of pocket) is money the store owes them until
 * a "Reembolso a socio" pays it back (that entry's "who" is the person repaid). */
export const STORE_PAYER = 'La tienda';
export const REIMBURSEMENT_CATEGORY = 'Reembolso a socio';
export const isStorePayer = (who: string | null | undefined) => !who || who.trim().toLowerCase() === STORE_PAYER.toLowerCase();

export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Wompi', 'Crédito', 'Otro'] as const;

/** Category the merchandise purchases show under in breakdowns and the ledger. */
export const PURCHASE_CATEGORY = 'Compra de mercancía';

/** Colombia has no daylight saving: every day starts at 05:00 UTC. */
export const TZ_OFFSET = '-05:00';

export const todayInColombia = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
