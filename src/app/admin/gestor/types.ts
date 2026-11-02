export type Status = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type ManagedOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressComplement: string | null;
  shippingCity: string;
  shippingDepartment: string | null;
  status: Status;
  paymentMethod: 'WOMPI' | 'COD' | 'TRANSFER';
  wompiTransactionId: string | null;
  totalCents: number;
  wompiReference: string;
  trackingNumber: string | null;
  trackingStatus: string | null;
  trackingCheckedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: { id: string; quantity: number; size: string; color: string | null; product: { name: string } }[];
};
