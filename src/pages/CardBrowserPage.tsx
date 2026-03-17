import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from '../types/card';
import { useCards } from '../store/CardContext';
import { useCardSearch } from '../hooks/useCards';
import { SearchBar } from '../components/cardBrowser/SearchBar';
import { CardGrid } from '../components/cardBrowser/CardGrid';
import { CardDetail } from '../components/cardBrowser/CardDetail';
import styles from './CardBrowserPage.module.css';

export function CardBrowserPage() {
  const { t } = useTranslation();
  const { cards, loading, error } = useCards();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { filteredCards } = useCardSearch(cards, { query, typeFilter, availabilityFilter });

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
        availabilityFilter={availabilityFilter}
        onAvailabilityFilterChange={setAvailabilityFilter}
        resultCount={filteredCards.length}
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>{t('cards.loading')}</p>
        </div>
      ) : (
        <CardGrid
          cards={filteredCards}
          onCardClick={setSelectedCard}
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
