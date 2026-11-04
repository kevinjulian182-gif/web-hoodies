export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wearafra.com').replace(/\/$/, '');

export const absoluteUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

/** Meta description length: cut at a word boundary near 155 characters. */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').replace(/[*_#>`•]/g, '').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

/** Store photos are WebP; social networks and Google prefer JPG, so shared
 * and structured-data images go through the JPG converter. */
export function jpgImage(url: string): string {
  const full = absoluteUrl(url);
  const host = new URL(full).hostname;
  const ours = host.endsWith('.blob.vercel-storage.com') || full.startsWith(SITE_URL);
  return ours ? `${SITE_URL}/feeds/image?src=${encodeURIComponent(full)}` : full;
}
