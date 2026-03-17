import { useTranslation } from 'react-i18next';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  availabilityFilter: string;
  onAvailabilityFilterChange: (value: string) => void;
  resultCount: number;
}

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  availabilityFilter,
  onAvailabilityFilterChange,
  resultCount,
}: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.searchBar}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={t('cards.searchPlaceholder')}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      <select
        className={styles.typeSelect}
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
      >
        <option value="all">{t('cards.allTypes')}</option>
        <option value="normal">{t('cards.normalMonster')}</option>
        <option value="effect">{t('cards.effectMonster')}</option>
        <option value="ritual">{t('cards.ritualMonster')}</option>
        <option value="fusion">{t('cards.fusionMonster')}</option>
        <option value="spell">{t('cards.spellCards')}</option>
        <option value="trap">{t('cards.trapCards')}</option>
      </select>

      <select
        className={styles.typeSelect}
        value={availabilityFilter}
        onChange={(e) => onAvailabilityFilterChange(e.target.value)}
      >
        <option value="all">Alle Karten</option>
        <option value="available">Verfuegbar</option>
        <option value="locked">Noch gesperrt</option>
      </select>

      <span className={styles.resultCount}>
        {resultCount} {t('cards.cardCount', { count: resultCount }).split(' ').slice(1).join(' ')}
      </span>
    </div>
  );
}
