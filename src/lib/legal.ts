// Date of the current legal texts (terms, refunds, privacy, cookies). It is
// stored with every acceptance, so bump it whenever those pages change.
export const LEGAL_VERSION = '2026-10-20';
export const LEGAL_UPDATED_LABEL = '20 de octubre de 2026';

export const COOKIE_CONSENT_KEY = 'afra-cookie-consent';
export type CookieChoice = 'all' | 'necessary';

// Return policy numbers: used by /reembolsos and by the structured data
// (MerchantReturnPolicy), so the page and Google always agree.
export const RETURN_POLICY = {
  exchangeDays: 15,
  withdrawalBusinessDays: 5,
  refundMaxDays: 30,
};

export type StoredCookieConsent = { choice: CookieChoice; at: string; version: string };
export const COOKIE_CONSENT_EVENT = 'afra:cookie-consent';
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** The visitor's cookie choice, or null if they haven't chosen (or it's
 * older than 12 months and must be asked again). Client-only. */
export function readCookieConsent(): StoredCookieConsent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null') as StoredCookieConsent | null;
    if (!saved || (saved.choice !== 'all' && saved.choice !== 'necessary')) return null;
    if (Date.now() - new Date(saved.at).getTime() > CONSENT_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

/** Analytics and advertising only run when the visitor accepted them. */
export function hasOptionalCookieConsent(): boolean {
  return readCookieConsent()?.choice === 'all';
}
