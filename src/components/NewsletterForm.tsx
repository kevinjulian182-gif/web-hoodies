'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setStatus('sent');
    setEmail('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <input
        type="email"
        required
        placeholder="Tu correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 border border-cream-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-coffee-600"
      />
      <button type="submit" className="bg-coffee-900 text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium">
        {status === 'sent' ? '¡Listo!' : 'Suscribirme'}
      </button>
    </form>
  );
}
