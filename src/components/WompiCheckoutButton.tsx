'use client';

import { useEffect, useRef, useState } from 'react';

type CustomerData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  /** Colombian mobile numbers are 10 digits with no leading 0; Wompi wants the prefix split out. */
  phoneNumberPrefix?: string;
};

type ShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  phoneNumber: string;
  name: string;
  country?: string;
};

type Props = {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
  /** Pre-fills Wompi's hosted checkout so the customer doesn't retype what
   * they already gave us. Wompi silently ignores attributes it doesn't
   * recognize, so an outdated attribute name here degrades to "no prefill",
   * never a broken payment. */
  customer?: CustomerData;
  shippingAddress?: ShippingAddress;
};

export default function WompiCheckoutButton({
  publicKey,
  currency,
  amountInCents,
  reference,
  signature,
  redirectUrl,
  customer,
  shippingAddress,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.innerHTML = '';
    setReady(false);

    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.setAttribute('data-render', 'button');
    script.setAttribute('data-public-key', publicKey);
    script.setAttribute('data-currency', currency);
    script.setAttribute('data-amount-in-cents', String(amountInCents));
    script.setAttribute('data-reference', reference);
    script.setAttribute('data-signature:integrity', signature);
    script.setAttribute('data-redirect-url', redirectUrl);

    if (customer) {
      script.setAttribute('data-customer-data:email', customer.email);
      script.setAttribute('data-customer-data:full-name', customer.fullName);
      script.setAttribute('data-customer-data:phone-number', customer.phoneNumber);
      script.setAttribute('data-customer-data:phone-number-prefix', customer.phoneNumberPrefix ?? '+57');
    }

    if (shippingAddress) {
      script.setAttribute('data-shipping-address:address-line-1', shippingAddress.addressLine1);
      if (shippingAddress.addressLine2) {
        script.setAttribute('data-shipping-address:address-line-2', shippingAddress.addressLine2);
      }
      script.setAttribute('data-shipping-address:country', shippingAddress.country ?? 'CO');
      script.setAttribute('data-shipping-address:city', shippingAddress.city);
      script.setAttribute('data-shipping-address:region', shippingAddress.region);
      script.setAttribute('data-shipping-address:phone-number', shippingAddress.phoneNumber);
      script.setAttribute('data-shipping-address:name', shippingAddress.name);
    }

    // Wompi's own button only exists once this script finishes loading and
    // injects it — until then the form is empty, so a skeleton fills that gap.
    script.onload = () => setReady(true);

    form.appendChild(script);
  }, [publicKey, currency, amountInCents, reference, signature, redirectUrl, customer, shippingAddress]);

  return (
    <div className="rounded-2xl border border-coffee-200 bg-gradient-to-b from-cream-100 to-cream-50 p-5 shadow-[0_12px_32px_-16px_rgba(54,37,25,0.25)]">
      <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium text-coffee-600">
        <ShieldCheckIcon />
        Pago cifrado y procesado de forma segura por Wompi
      </div>

      <div className="relative">
        {!ready && (
          <div className="h-[52px] w-full animate-pulse rounded-full bg-cream-200" aria-hidden />
        )}
        <form ref={formRef} className={ready ? '' : 'sr-only'} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-coffee-400">
        <span>Visa</span>
        <Dot />
        <span>Mastercard</span>
        <Dot />
        <span>PSE</span>
        <Dot />
        <span>Nequi</span>
        <Dot />
        <span>Bancolombia</span>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-0.5 w-0.5 rounded-full bg-coffee-300" aria-hidden />;
}

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
