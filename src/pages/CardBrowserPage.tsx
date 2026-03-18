import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { Card } from '../types/card';
import { useCards } from '../store/CardContext';
import { useAppData } from '../store/AppDataContext';
import { useCardSearch } from '../hooks/useCards';
import { SearchBar, type ViewMode } from '../components/cardBrowser/SearchBar';
import { CardGrid } from '../components/cardBrowser/CardGrid';
import { CardTable } from '../components/cardBrowser/CardTable';
import { CardDetail } from '../components/cardBrowser/CardDetail';
import styles from './CardBrowserPage.module.css';

export function CardBrowserPage() {
  const { t } = useTranslation();
  const { cards, loading, error } = useCards();
  const { sets } = useAppData();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [setFilter, setSetFilter] = useState(() => searchParams.get('set') ?? 'all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [banFilter, setBanFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Sync set filter from URL query param
  useEffect(() => {
    const urlSet = searchParams.get('set');
    if (urlSet) setSetFilter(urlSet);
  }, [searchParams]);

  const { filteredCards } = useCardSearch(cards, { query, typeFilter, availabilityFilter, setFilter, banFilter });

  if (error) {
    return (
      <div className={styles.errorState}>
        <h2>{t('cards.errorTitle')}</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          {t('cards.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        setFilter={setFilter}
        onSetFilterChange={setSetFilter}
        sets={sets}
        availabilityFilter={availabilityFilter}
        onAvailabilityFilterChange={setAvailabilityFilter}
        banFilter={banFilter}
        onBanFilterChange={setBanFilter}
        resultCount={filteredCards.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>{t('cards.loading')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <CardGrid
          cards={filteredCards}
          onCardClick={setSelectedCard}
          setFilter={setFilter}
        />
      ) : (
        <CardTable
          cards={filteredCards}
          onCardClick={setSelectedCard}
          setFilter={setFilter}
        />
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
