import type { Card } from '../../types/card';
import { CardTile } from './CardTile';
import styles from './CardGrid.module.css';

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export function CardGrid({ cards, onCardClick }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className={styles.empty}>
        Keine Karten gefunden.
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
        />
      ))}
    </div>
  );
}
