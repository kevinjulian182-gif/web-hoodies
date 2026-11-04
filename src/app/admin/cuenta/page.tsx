'use client';

import { useEffect, useState } from 'react';
import WhatsAppAlertsCard from '@/components/admin/WhatsAppAlertsCard';
import CustomerConfirmationCard from '@/components/admin/CustomerConfirmationCard';
import WhatsAppCatalogCard from '@/components/admin/WhatsAppCatalogCard';
import GoogleMerchantCard from '@/components/admin/GoogleMerchantCard';
import WompiStatusCard from '@/components/admin/WompiStatusCard';

const inputClass =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-sm text-coffee-900 outline-none transition-colors focus:border-coffee-600';

export default function AccountPage() {
  const [savedEmail, setSavedEmail] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/account')
      .then((r) => r.json())
      .then((data) => {
        setSavedEmail(data.email ?? '');
        setEmail(data.email ?? '');
      });
  }, []);

  const emailChanged = email.trim().toLowerCase() !== savedEmail.toLowerCase();
  const passwordChanged = newPassword.length > 0;
  const passwordTooShort = passwordChanged && newPassword.length < 8;
  const passwordsMismatch = passwordChanged && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSave =
    (emailChanged || passwordChanged) &&
    !passwordTooShort &&
    (!passwordChanged || newPassword === confirmPassword) &&
    currentPassword.length > 0 &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch('/api/admin/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        ...(emailChanged ? { email } : {}),
        ...(passwordChanged ? { newPassword } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'No se pudo guardar. Intenta de nuevo.');
      return;
    }
    const changed = [emailChanged && 'el correo', passwordChanged && 'la contraseña'].filter(Boolean).join(' y ');
    setSuccess(`Listo, actualizamos ${changed}. Usa los datos nuevos la próxima vez que inicies sesión.`);
    setSavedEmail(data.email);
    setEmail(data.email);
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
  };

  return (
    <div>
      <div className="max-w-md">
      <h1 className="mb-2 text-2xl font-semibold tracking-tightest text-coffee-900">Mi cuenta</h1>
      <p className="mb-8 text-sm text-coffee-600">Cambia el correo y la contraseña con los que entras al panel.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <label htmlFor="email" className="text-sm font-medium text-coffee-800">
            Correo de acceso
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-coffee-800">Nueva contraseña</p>
            <button
              type="button"
              onClick={() => setShowPasswords((v) => !v)}
              className="text-xs text-coffee-500 underline underline-offset-4 hover:text-coffee-900"
            >
              {showPasswords ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div>
            <input
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Déjala vacía si no quieres cambiarla"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-describedby="password-hint"
              className={inputClass}
            />
            <p id="password-hint" className={`mt-1 text-xs ${passwordTooShort ? 'text-red-700' : 'text-coffee-500'}`}>
              Mínimo 8 caracteres.
            </p>
          </div>
          {passwordChanged && (
            <div>
              <input
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              {passwordsMismatch && <p className="mt-1 text-xs text-red-700">Las contraseñas no coinciden.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-cream-200 bg-cream-100/50 p-4">
          <label htmlFor="current" className="text-sm font-medium text-coffee-800">
            Contraseña actual
          </label>
          <p className="text-xs text-coffee-500">Para confirmar que eres tú.</p>
          <input
            id="current"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </section>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="w-full rounded-lg bg-coffee-900 px-4 py-3 text-sm font-medium text-cream-50 transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
      </div>
      <WompiStatusCard />
      <WhatsAppAlertsCard />
      <CustomerConfirmationCard />
      <WhatsAppCatalogCard />
      <GoogleMerchantCard />
    </div>
  );
}
