/**
 * FloatingCards — animated card background effect.
 * Cards float slowly across the full screen.
 */

import { useMemo } from 'react';
import { getCardImageUrl } from '../../services/cardApi';
import type { Card } from '../../types/card';
import styles from './FloatingCards.module.css';

interface FloatingCardsProps {
  cards: Card[];
  count?: number;
}

interface FloatingCardData {
  id: number;
  imageUrl: string;
  startY: number;
  speed: number;
  delay: number;
  size: number;
  opacity: number;
}

function generate(cardIds: number[], count: number): FloatingCardData[] {
  const result: FloatingCardData[] = [];
  for (let i = 0; i < count; i++) {
    const cardId = cardIds[i % cardIds.length];
    result.push({
      id: cardId,
      imageUrl: getCardImageUrl(cardId, 'small'),
      startY: (i / count) * 100,
      speed: 40 + Math.random() * 30,
      delay: Math.random() * -60,
      size: 40 + Math.random() * 30,
      opacity: 0.04 + Math.random() * 0.06,
    });
  }
  return result;
}

export function FloatingCards({ cards, count = 60 }: FloatingCardsProps) {
  const floatingCards = useMemo(() => {
    if (cards.length === 0) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const ids = shuffled.slice(0, count * 2).map((c) => c.id);
    return generate(ids, count);
  }, [cards, count]);

  if (floatingCards.length === 0) return null;

  return (
    <div className={styles.container}>
      {floatingCards.map((fc, i) => (
        <div
          key={`${fc.id}-${i}`}
          className={styles.card}
          style={{
            top: `${fc.startY}%`,
            width: `${fc.size}px`,
            opacity: fc.opacity,
            animationDuration: `${fc.speed}s`,
            animationDelay: `${fc.delay}s`,
          }}
        >
          <img src={fc.imageUrl} alt="" loading="lazy" draggable={false} />
        </div>
      ))}
    </div>
  );
}
