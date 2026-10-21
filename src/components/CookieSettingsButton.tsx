'use client';

export const OPEN_COOKIE_SETTINGS = 'afra:open-cookie-settings';

/** Reopens the cookie banner so the visitor can change their choice. */
export default function CookieSettingsButton({ className, label = 'Configurar cookies' }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))} className={className}>
      {label}
    </button>
  );
}
