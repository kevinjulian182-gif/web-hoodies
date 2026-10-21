'use client';

import { useState } from 'react';
import LegalConsentFields, { type LegalConsentState } from '@/components/LegalConsentFields';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [consent, setConsent] = useState<LegalConsentState>({ terms: false, privacy: false });
  const [consentError, setConsentError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent.terms || !consent.privacy) {
      setConsentError(true);
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, acceptTerms: consent.terms, acceptPrivacy: consent.privacy }),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('sent');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Tu correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 border border-cream-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-coffee-600"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-coffee-900 text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:bg-coffee-800 active:scale-[0.97] disabled:opacity-60"
        >
          {status === 'sent' ? 'Listo' : status === 'sending' ? 'Enviando…' : 'Suscribirme'}
        </button>
      </form>
      <div className="mt-3 text-left">
        <LegalConsentFields value={consent} onChange={setConsent} showError={consentError} />
      </div>
      {status === 'error' && (
        <p className="mt-2 text-center text-xs text-red-700">No pudimos guardar tu correo. Intenta de nuevo.</p>
      )}
    </div>
  );
}
