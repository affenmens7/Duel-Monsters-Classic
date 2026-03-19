/**
 * Shared sort indicator for table headers.
 * Used by CardTable, AdminCardsPage, AdminSetDetailPage.
 */

/** Returns '▲', '▼', or '' based on current sort state. */
export function getSortArrow(
  currentSortBy: string,
  currentSortDir: 'asc' | 'desc',
  columnKey: string,
): string {
  if (currentSortBy !== columnKey) return '';
  return currentSortDir === 'asc' ? ' \u25B2' : ' \u25BC';
}
