import { useTranslation } from 'react-i18next';
import type { CachedSet } from '../../services/cardApi';
import styles from './SearchBar.module.css';

export type ViewMode = 'grid' | 'table';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  availabilityFilter: string;
  onAvailabilityFilterChange: (value: string) => void;
  setFilter: string;
  onSetFilterChange: (value: string) => void;
  banFilter: string;
  onBanFilterChange: (value: string) => void;
  sets: CachedSet[];
  resultCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  availabilityOptions?: { value: string; label: string }[];
}

export function SearchBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  availabilityFilter,
  onAvailabilityFilterChange,
  setFilter,
  onSetFilterChange,
  banFilter,
  onBanFilterChange,
  sets,
  resultCount,
  viewMode,
  onViewModeChange,
  availabilityOptions,
}: SearchBarProps) {
  const { t } = useTranslation();

  const setsWithCards = sets
    .filter((s) => s.card_count > 0)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.wave - b.wave || a.name.localeCompare(b.name);
    });

  return (
    <div className={styles.searchBar}>
      <div className={styles.row}>
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
          value={setFilter}
          onChange={(e) => onSetFilterChange(e.target.value)}
        >
          <option value="all">{t('cards.allSets')}</option>
          {setsWithCards.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.card_count}){s.active ? '' : ` - ${t('cards.locked')}`}
            </option>
          ))}
        </select>

        <select
          className={styles.typeSelect}
          value={availabilityFilter}
          onChange={(e) => onAvailabilityFilterChange(e.target.value)}
        >
          {availabilityOptions ? (
            availabilityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))
          ) : (
            <>
              <option value="all">{t('cards.allCards')}</option>
              <option value="available">{t('cards.available')}</option>
              <option value="locked">{t('cards.locked')}</option>
            </>
          )}
        </select>

        <select
          className={styles.typeSelect}
          value={banFilter}
          onChange={(e) => onBanFilterChange(e.target.value)}
        >
          <option value="all">{t('cards.allBanStatus')}</option>
          <option value="Forbidden">{t('banStatus.Forbidden')}</option>
          <option value="Limited">{t('banStatus.Limited')}</option>
          <option value="Semi-Limited">{t('banStatus.Semi-Limited')}</option>
          <option value="Unlimited">{t('banStatus.Unlimited')}</option>
        </select>

      </div>
      <div className={styles.subRow}>
        <span className={styles.resultCount}>
          {resultCount} {t('cards.cardCount', { count: resultCount }).split(' ').slice(1).join(' ')}
        </span>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('grid')}
            title={t('cards.gridView')}
          >
            &#9638;&#9638;
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('table')}
            title={t('cards.tableView')}
          >
            &#9776;
          </button>
        </div>
      </div>
    </div>
  );
}
