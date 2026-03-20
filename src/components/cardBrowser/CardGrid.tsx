import { useTranslation } from 'react-i18next';
import type { Card } from '../../types/card';
import { CardTile } from './CardTile';
import styles from './CardGrid.module.css';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  onCardDragStart?: (cardId: number, e: React.MouseEvent) => void;
  setFilter?: string;
  isCardMaxed?: (cardId: number) => boolean;
  isCardGreyed?: (cardId: number) => boolean;
  artworkPrefs?: Map<number, number>;
  ignoreAvailability?: boolean;
}

export function CardGrid({ cards, onCardClick, onCardDragStart, setFilter, isCardMaxed, isCardGreyed, artworkPrefs, ignoreAvailability }: CardGridProps) {
  const { t } = useTranslation();

  if (cards.length === 0) {
    return (
      <div className={styles.empty}>
        {t('cards.noResults')}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <CardTile
          key={card.id}
          card={card}
          onClick={() => onCardClick(card)}
          onMouseDown={onCardDragStart ? (e) => onCardDragStart(card.id, e) : undefined}
          setFilter={setFilter}
          forceMaxed={isCardMaxed?.(card.id)}
          forceGreyed={isCardGreyed?.(card.id)}
          preferredArtworkId={artworkPrefs?.get(card.id)}
          ignoreAvailability={ignoreAvailability}
        />
      ))}
    </div>
  );
}
