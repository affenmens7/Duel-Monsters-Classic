/**
 * SortDropdown — reusable card sort selector.
 * Used in shop detail views, card browser, collection, admin pages.
 */

import { useTranslation } from 'react-i18next';
import { CARD_SORT_OPTIONS, type CardSortKey } from '../../utils/cardSort';
import styles from './SortDropdown.module.css';

interface SortDropdownProps {
  value: CardSortKey;
  onChange: (key: CardSortKey) => void;
  /** Subset of sort keys to show (default: all). */
  options?: CardSortKey[];
}

export function SortDropdown({ value, onChange, options }: SortDropdownProps) {
  const { t } = useTranslation();

  const visibleOptions = options
    ? CARD_SORT_OPTIONS.filter((o) => options.includes(o.key))
    : CARD_SORT_OPTIONS;

  return (
    <select
      className={styles.sortSelect}
      value={value}
      onChange={(e) => onChange(e.target.value as CardSortKey)}
    >
      {visibleOptions.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
  );
}
