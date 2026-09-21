'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Error al iniciar sesión');
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-8">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-coffee-900 text-cream-50 py-3 rounded-full text-sm font-medium transition-colors hover:bg-coffee-800 active:scale-[0.98]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
