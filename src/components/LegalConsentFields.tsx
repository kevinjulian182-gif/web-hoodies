'use client';

import Link from 'next/link';

export type LegalConsentState = { terms: boolean; privacy: boolean };

/** The two required acceptances shown on every form that collects data. */
export default function LegalConsentFields({
  value,
  onChange,
  showError,
  tone = 'light',
}: {
  value: LegalConsentState;
  onChange: (next: LegalConsentState) => void;
  showError?: boolean;
  tone?: 'light' | 'dark';
}) {
  const text = tone === 'dark' ? 'text-cream-100/80' : 'text-coffee-700';
  const link = tone === 'dark' ? 'text-cream-50' : 'text-coffee-900';
  const box =
    'mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-cream-300 accent-coffee-900';

  const row = (key: keyof LegalConsentState, children: React.ReactNode) => {
    const missing = showError && !value[key];
    return (
      <label className={`flex items-start gap-2.5 text-[13px] leading-snug ${text}`}>
        <input
          type="checkbox"
          checked={value[key]}
          onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          aria-invalid={missing || undefined}
          className={`${box} ${missing ? 'outline outline-2 outline-red-500' : ''}`}
        />
        <span>{children}</span>
      </label>
    );
  };

  return (
    <div className="space-y-2.5">
      {row(
        'terms',
        <>
          He leído y acepto los{' '}
          <Link href="/terminos" target="_blank" className={`font-medium underline underline-offset-2 ${link}`}>
            Términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/reembolsos" target="_blank" className={`font-medium underline underline-offset-2 ${link}`}>
            Política de cambios y reembolsos
          </Link>
          .
        </>
      )}
      {row(
        'privacy',
        <>
          Autorizo el tratamiento de mis datos personales según la{' '}
          <Link href="/privacidad" target="_blank" className={`font-medium underline underline-offset-2 ${link}`}>
            Política de privacidad
          </Link>
          .
        </>
      )}
      {showError && (!value.terms || !value.privacy) && (
        <p role="alert" className="text-xs text-red-600">
          Para continuar, marca las dos casillas.
        </p>
      )}
    </div>
  );
}
