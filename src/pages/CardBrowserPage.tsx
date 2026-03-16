import { useState } from 'react';
import type { Card } from '../types/card';
import { useCards, useCardSearch } from '../hooks/useCards';
import { SearchBar } from '../components/cardBrowser/SearchBar';
import { CardGrid } from '../components/cardBrowser/CardGrid';
import { CardDetail } from '../components/cardBrowser/CardDetail';
import styles from './CardBrowserPage.module.css';

export function CardBrowserPage() {
  const { cards, loading, error } = useCards();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const { filteredCards } = useCardSearch(cards, query, typeFilter);

  if (error) {
    return (
      <div className={styles.errorState}>
        <h2>Fehler beim Laden</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Erneut versuchen
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
        resultCount={filteredCards.length}
      />

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Lade Kartendaten...</p>
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
