/**
 * CardDetailPopup — shared card detail overlay used across the app.
 * Shows card image, name (DE/EN based on language), type, rarity badge,
 * ATK/DEF, level, attribute, description, and optional artwork selection.
 *
 * Used in: Admin Set Detail, Admin Card Database, Public Card Browser,
 * Deckbuilder, Shop Set Preview.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCardImageUrl } from '../../services/cardApi';
import styles from './CardDetailPopup.module.css';

// Rarity badge color mapping
function rarityClass(rarity: string): string {
  const lower = rarity.toLowerCase();
  if (lower.includes('secret')) return styles.raritySecretRare;
  if (lower.includes('ultra')) return styles.rarityUltraRare;
  if (lower.includes('super')) return styles.raritySuperRare;
  if (lower.includes('rare')) return styles.rarityRare;
  if (lower.includes('short')) return styles.rarityShortPrint;
  return styles.rarityCommon;
}

export interface CardDetailData {
  id: number;
  nameDe: string;
  nameEn: string;
  desc?: string;
  descDe?: string;
  descEn?: string;
  type?: string;
  frameType?: string;
  atk?: number | null;
  def?: number | null;
  level?: number | null;
  attribute?: string | null;
  race?: string | null;
  archetype?: string | null;
  rarity?: string | null;
  artworkId?: number | null;
}

export interface ArtworkOption {
  artworkId: number;
  label: string;
  imagePath: string;
  isDefault: boolean;
  availableIn?: string | null;
}

interface CardDetailPopupProps {
  card: CardDetailData;
  onClose: () => void;
  artworks?: ArtworkOption[];
  currentArtworkId?: number | null;
  onArtworkChange?: (artworkId: number) => void;
  children?: React.ReactNode;
}

export function CardDetailPopup({
  card,
  onClose,
  artworks,
  currentArtworkId,
  onArtworkChange,
  children,
}: CardDetailPopupProps) {
  const { i18n, t } = useTranslation();
  const isEn = i18n.language === 'en';

  const defaultArtId = currentArtworkId ?? card.artworkId ?? card.id;
  const [previewArtId, setPreviewArtId] = useState<number>(defaultArtId);
  const artId = previewArtId;

  // Find the currently previewed artwork info
  const activeArtwork = artworks?.find((a) => a.artworkId === artId);

  const displayName = isEn ? card.nameEn : card.nameDe;
  const secondaryName = isEn ? card.nameDe : card.nameEn;
  const desc = isEn
    ? (card.descEn ?? card.desc ?? card.descDe ?? '')
    : (card.descDe ?? card.desc ?? card.descEn ?? '');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>x</button>
        <div className={styles.content}>
          <div className={styles.imageCol}>
            <img src={getCardImageUrl(card.id, 'full', artId)} alt={displayName} />
          </div>
          <div className={styles.infoCol}>
            <h3 className={styles.name}>{displayName}</h3>
            {secondaryName !== displayName && (
              <span className={styles.secondaryName}>{secondaryName}</span>
            )}

            {/* Artwork availability badge — shows when previewing a specific artwork */}
            {activeArtwork && artworks && artworks.length > 1 && (
              <div className={styles.availabilityBadge}>
                {activeArtwork.availableIn ? (
                  <span className={styles.badgeAvailable}>{activeArtwork.availableIn}</span>
                ) : (
                  <span className={styles.badgeUnavailable}>{t('cardDetail.notAvailable')}</span>
                )}
              </div>
            )}

            <div className={styles.typeLine}>
              {(card.type || card.frameType) && (
                <span className={styles.typeTag}>{card.type ?? card.frameType}</span>
              )}
              {card.rarity && (
                <span className={`${styles.rarityBadge} ${rarityClass(card.rarity)}`}>
                  {card.rarity}
                </span>
              )}
            </div>

            {card.atk != null && (
              <div className={styles.stats}>
                <span className={styles.atk}>ATK/{card.atk}</span>
                <span className={styles.def}>DEF/{card.def ?? '?'}</span>
              </div>
            )}

            {(card.level != null || card.attribute) && (
              <div className={styles.meta}>
                {card.level != null && <span>{t('cardDetail.level', 'Level')}: {card.level}</span>}
                {card.attribute && <span>{t('cardDetail.attribute', 'Attribute')}: {card.attribute}</span>}
                {card.race && <span>{card.race}</span>}
              </div>
            )}

            {desc && <p className={styles.desc}>{desc}</p>}

            {/* Artwork gallery — click to preview, thumbnails only */}
            {artworks && artworks.length > 1 && (
              <div className={styles.artworkSection}>
                <span className={styles.artworkTitle}>Artworks ({artworks.length})</span>
                <div className={styles.artworkGrid}>
                  {artworks.map((art) => (
                    <div
                      key={art.artworkId}
                      className={`${styles.artworkThumb} ${art.artworkId === artId ? styles.artworkActive : ''}`}
                      onClick={() => {
                        setPreviewArtId(art.artworkId);
                        onArtworkChange?.(art.artworkId);
                      }}
                    >
                      <img src={getCardImageUrl(card.id, 'small', art.artworkId)} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context-specific content (actions, inventory info, etc.) */}
            {children}

            <div className={styles.cardId}>ID: {card.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
