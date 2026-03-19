/**
 * Bilingual field selection helper.
 * Used by ShopPage, admin pages, and anywhere DE/EN fallback is needed.
 */

/** Picks the correct locale string with fallback to the other language. */
export function localizeBilingual(
  de: string | null | undefined,
  en: string | null | undefined,
  isEn: boolean,
): string {
  if (isEn) return en ?? de ?? '';
  return de ?? en ?? '';
}
