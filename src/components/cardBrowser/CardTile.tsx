import { useState } from 'react';
import type { Card } from '../../types/card';
import { getCardImageUrl } from '../../services/cardApi';
import { useCardLocale } from '../../hooks/useCardLocale';
import styles from './CardTile.module.css';

interface CardTileProps {
  card: Card;
  onClick: () => void;
  setFilter?: string;
  forceMaxed?: boolean;
}

function getFrameClass(frameType: string): string {
  switch (frameType) {
    case 'normal': return styles.frameNormal;
    case 'effect': return styles.frameEffect;
    case 'ritual': return styles.frameRitual;
    case 'fusion': return styles.frameFusion;
    case 'spell': return styles.frameSpell;
    case 'trap': return styles.frameTrap;
    default: return '';
  }
}

export function CardTile({ card, onClick, setFilter, forceMaxed }: CardTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { localize } = useCardLocale();
  const loc = localize(card);

  // Use set-specific artwork when filtering by set, otherwise the default artwork
  const artworkId = setFilter && setFilter !== 'all'
    ? card.sets?.find((s) => s.name === setFilter)?.artworkId ?? card.artworkIds?.[0]
    : card.artworkIds?.[0] ?? undefined;
  const imageUrl = getCardImageUrl(card.id, 'small', artworkId);

  return (
    <button
      className={`${styles.tile} ${getFrameClass(card.frameType)} ${card.available === false || forceMaxed ? styles.locked : ''}`}
      onClick={onClick}
      title={loc.name}
    >
      <div className={styles.imageWrapper}>
        {!imageLoaded && <div className={styles.placeholder} />}
        <img
          src={imageUrl}
          alt={loc.name}
          className={styles.image}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      </div>
      <span className={styles.name}>{loc.name}</span>
    </button>
  );
}
