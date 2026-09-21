'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.innerHTML = '';

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

    form.appendChild(script);
  }, [publicKey, currency, amountInCents, reference, signature, redirectUrl, customer, shippingAddress]);

  return <form ref={formRef} />;
}
