'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
      {status === 'error' && (
        <p className="mt-2 text-center text-xs text-red-700">No pudimos guardar tu correo. Intenta de nuevo.</p>
      )}
    </div>
  );
}
