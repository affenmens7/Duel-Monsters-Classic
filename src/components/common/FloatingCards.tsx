/**
 * FloatingCards — animated card background effect.
 * Cards float slowly upward across the full screen.
 * Cards the user owns appear brighter (ownedCardIds prop).
 */

import { useMemo } from 'react';
import { getCardImageUrl } from '../../services/cardApi';
import type { Card } from '../../types/card';
import styles from './FloatingCards.module.css';

interface FloatingCardsProps {
  cards: Card[];
  ownedCardIds?: Set<number>;
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
  owned: boolean;
}

function generate(
  cardIds: number[],
  count: number,
  ownedIds: Set<number>,
): FloatingCardData[] {
  const result: FloatingCardData[] = [];
  for (let i = 0; i < count; i++) {
    const cardId = cardIds[i % cardIds.length];
    const owned = ownedIds.has(cardId);
    result.push({
      id: cardId,
      imageUrl: getCardImageUrl(cardId, 'small'),
      startY: (i / count) * 100,
      speed: 40 + Math.random() * 30,
      delay: Math.random() * -60,
      size: 40 + Math.random() * 30,
      opacity: owned ? 0.06 + Math.random() * 0.06 : 0.015 + Math.random() * 0.03,
      owned,
    });
  }
  return result;
}

const EMPTY_SET = new Set<number>();

export function FloatingCards({ cards, ownedCardIds, count = 60 }: FloatingCardsProps) {
  const owned = ownedCardIds ?? EMPTY_SET;

  const floatingCards = useMemo(() => {
    if (cards.length === 0) return [];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const ids = shuffled.slice(0, count * 2).map((c) => c.id);
    return generate(ids, count, owned);
  }, [cards, count, owned]);

  if (floatingCards.length === 0) return null;

  return (
    <div className={styles.container}>
      {floatingCards.map((fc, i) => (
        <div
          key={`${fc.id}-${i}`}
          className={`${styles.card} ${fc.owned ? styles.owned : ''}`}
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
