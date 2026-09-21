'use client';

import { useEffect, useRef } from 'react';

type Props = {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signature: string;
  redirectUrl: string;
};

export default function WompiCheckoutButton({
  publicKey,
  currency,
  amountInCents,
  reference,
  signature,
  redirectUrl,
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
    form.appendChild(script);
  }, [publicKey, currency, amountInCents, reference, signature, redirectUrl]);

  return <form ref={formRef} />;
}
