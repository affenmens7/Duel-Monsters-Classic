/** Convert a product name to a URL-safe slug: spaces → underscores, then encodeURIComponent. */
export function nameToSlug(name: string): string {
  return name.replaceAll(' ', '_');
}

/** Convert a URL slug back to a product name: underscores → spaces. */
export function slugToName(slug: string): string {
  return decodeURIComponent(slug).replaceAll('_', ' ');
}
