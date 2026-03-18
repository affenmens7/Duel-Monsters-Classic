import { useTranslation } from 'react-i18next';
import type { Card } from '../../types/card';
import { CardTile } from './CardTile';
import styles from './CardGrid.module.css';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
  setFilter?: string;
  isCardMaxed?: (cardId: number) => boolean;
}

export function CardGrid({ cards, onCardClick, setFilter, isCardMaxed }: CardGridProps) {
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
          setFilter={setFilter}
          forceMaxed={isCardMaxed?.(card.id)}
        />
      ))}
    </div>
  );
}
