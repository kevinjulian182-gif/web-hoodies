// Orders started from the "Pedir por WhatsApp" buttons are stored like any
// other order (so they show up in Admin › Pedidos) and told apart by their
// reference prefix — no schema change needed.
export const WHATSAPP_ORDER_PREFIX = 'WA-';

export const isWhatsAppOrder = (reference: string) => reference.startsWith(WHATSAPP_ORDER_PREFIX);

export const PLACEHOLDER_ADDRESS = 'Por confirmar por WhatsApp';
