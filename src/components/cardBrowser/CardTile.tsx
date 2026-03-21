import { useState } from 'react';
import type { Card } from '../../types/card';
import { getCardImageUrl } from '../../services/cardApi';
import { useCardLocale } from '../../hooks/useCardLocale';
import { CardEffects } from '../animations/CardEffects';
import styles from './CardTile.module.css';

interface CardTileProps {
  card: Card;
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  setFilter?: string;
  forceMaxed?: boolean;
  forceGreyed?: boolean;
  preferredArtworkId?: number;
  ignoreAvailability?: boolean;
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

export function CardTile({ card, onClick, onMouseDown, setFilter, forceMaxed, forceGreyed, preferredArtworkId, ignoreAvailability }: CardTileProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { localize } = useCardLocale();
  const loc = localize(card);

  // Priority: set filter artwork > user preference > default
  const setEntry = setFilter && setFilter !== 'all'
    ? card.sets?.find((s) => s.name === setFilter)
    : undefined;
  const artworkId = setEntry
    ? setEntry.artworkId ?? card.artworkIds?.[0]
    : preferredArtworkId ?? card.artworkIds?.[0] ?? undefined;
  const imageUrl = getCardImageUrl(card.id, 'small', artworkId);

  // When set filter active: check if this specific artwork is available in ANY active set
  const isArtworkUnavailable = setEntry
    ? !(card.sets?.some((s) => s.artworkId === artworkId && s.active !== false) ?? false)
    : false;

  return (
    <button
      className={`${styles.tile} ${getFrameClass(card.frameType)} ${(!ignoreAvailability && card.available === false) || forceMaxed ? styles.locked : ''} ${forceGreyed || (!ignoreAvailability && isArtworkUnavailable && card.available) ? styles.greyedArtwork : ''}`}
      data-card-id={card.id}
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={loc.name}
    >
      <div className={styles.imageWrapper}>
        {!imageLoaded && <div className={styles.placeholder} />}
        <div style={{ opacity: imageLoaded ? 1 : 0 }}>
          <CardEffects
            imageSrc={imageUrl}
            alt={loc.name}
            rarity={card.rarity}
          />
        </div>
        {/* Hidden img for onLoad detection */}
        <img
          src={imageUrl}
          alt=""
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <span className={styles.name}>{loc.name}</span>
    </button>
  );
}
