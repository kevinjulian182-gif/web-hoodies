import { revalidatePath } from 'next/cache';

/** Every public page's own data is cached (see each page's `revalidate`
 * export) so visits are served instantly instead of hitting the DB on
 * every request. Admin writes call these right after saving so the
 * change is live immediately instead of waiting for the page's own
 * time-based revalidation window. */

/** Busts the entire site: the root layout (navbar/footer/theme) and every
 * page under it. Use for SiteContent edits, which can touch almost any
 * page (home sections, nosotros, PDP FAQ/review titles, footer, etc.) —
 * enumerating the exact affected pages isn't worth it when this is cheap
 * and instant. */
export function revalidateSite() {
  revalidatePath('/', 'layout');
}

/** Busts the pages that list products: home, catalog, and promos. Call
 * after any change to which products exist, their price/stock/active
 * state, or their brand. */
export function revalidateProductListings() {
  revalidatePath('/');
  revalidatePath('/productos');
  revalidatePath('/promos');
}

/** Busts one product's own detail page. Call in addition to
 * revalidateProductListings() whenever a specific product's slug is
 * known (edits, reviews, stock changes). */
export function revalidateProduct(slug: string) {
  revalidatePath(`/productos/${slug}`);
}

export function revalidateBlogListing() {
  revalidatePath('/blog');
}

export function revalidateBlogPost(slug: string) {
  revalidatePath(`/blog/${slug}`);
}
