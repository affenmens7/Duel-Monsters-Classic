/**
 * CardDetailPopup — shared card detail overlay used across the app.
 * Shows card image, name (DE/EN based on language), type, rarity badge,
 * ATK/DEF, level, attribute, description, and optional artwork selection.
 *
 * Used in: Admin Set Detail, Admin Card Database, Public Card Browser,
 * Deckbuilder, Shop Set Preview.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCardImageUrl } from '../../services/cardApi';
import { getRarityTier, getEffectTier } from '../../utils/rarity';
import { CardEffects } from '../animations/CardEffects';
import { generatePreviewMisprintData, type MisprintData } from '../../utils/misprint';
import type { ArtworkVariant } from '../../types/card';
import styles from './CardDetailPopup.module.css';

// Maps rarity tier to CSS module class
const RARITY_STYLE: Record<string, string> = {
  SecretRare: styles.raritySecretRare,
  UltraRare: styles.rarityUltraRare,
  SuperRare: styles.raritySuperRare,
  Rare: styles.rarityRare,
  ShortPrint: styles.rarityShortPrint,
  Common: styles.rarityCommon,
};

function rarityClass(rarity: string): string {
  return RARITY_STYLE[getRarityTier(rarity)] ?? styles.rarityCommon;
}


export interface CardSetBadgeData {
  name: string;
  code: string;
  active?: boolean;
  productType?: string;
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
  sets?: CardSetBadgeData[];
  banStatus?: string | null;
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
  onSetClick?: (setName: string) => void;
  ownedArtworkIds?: number[];
  isPreviewGreyed?: boolean;
  onPreviewArtworkChange?: (artworkId: number) => void;
  /** Available effect variants (ghost/misprint) per artwork — from user collection */
  artworkVariants?: ArtworkVariant[];
  /** If true, show all effect toggles as preview (public database mode) */
  effectPreviewMode?: boolean;
  children?: React.ReactNode;
}

export function CardDetailPopup({
  card,
  onClose,
  artworks,
  currentArtworkId,
  onArtworkChange,
  onSetClick,
  ownedArtworkIds,
  isPreviewGreyed,
  onPreviewArtworkChange,
  artworkVariants,
  effectPreviewMode,
  children,
}: CardDetailPopupProps) {
  const { i18n, t } = useTranslation();
  const isEn = i18n.language === 'en';

  const defaultArtId = currentArtworkId ?? card.artworkId ?? card.id;
  const [previewArtId, setPreviewArtId] = useState<number>(defaultArtId);
  const [previewGhost, setPreviewGhost] = useState(false);
  const [previewMisprint, setPreviewMisprint] = useState(false);
  const [previewMisprintData, setPreviewMisprintData] = useState<MisprintData | null>(null);

  // Sync preview when card or default artwork changes
  useEffect(() => {
    setPreviewArtId(defaultArtId);
    setPreviewGhost(false);
    setPreviewMisprint(false);
  }, [defaultArtId, card.id]);

  const artId = previewArtId;

  // Determine which effect variants the user owns for the current artwork
  const currentVariants = artworkVariants?.filter((v) => v.artworkId === artId) ?? [];
  const hasGhostVariant = currentVariants.some((v) => v.isGhost);
  const hasMisprintVariant = currentVariants.some((v) => v.isMisprint);
  const misprintVariant = currentVariants.find((v) => v.isMisprint && !v.isGhost);
  const ghostMisprintVariant = currentVariants.find((v) => v.isGhost && v.isMisprint);

  // Determine active misprint data based on toggle state
  const activeMisprintData: MisprintData | null =
    previewMisprint && previewGhost && ghostMisprintVariant?.misprintData
      ? ghostMisprintVariant.misprintData as MisprintData
      : previewMisprint && misprintVariant?.misprintData
        ? misprintVariant.misprintData as MisprintData
        : previewMisprint && effectPreviewMode
          ? previewMisprintData
          : null;

  // Can the user toggle this effect?
  const effectTier = getEffectTier(card.rarity ?? undefined);
  const canGhost = effectPreviewMode || hasGhostVariant;
  const canMisprint = effectPreviewMode || hasMisprintVariant;
  const showEffectToggles = effectPreviewMode || (artworkVariants && artworkVariants.length > 0);
  const ghostEligible = effectTier === 'holo' || effectTier === 'rainbow';

  // Find the currently previewed artwork info
  const activeArtwork = artworks?.find((a) => a.artworkId === artId);

  // Auto-calculate greyed state: if ownedArtworkIds provided and current artwork is not owned
  const isCurrentArtworkLocked = ownedArtworkIds ? !ownedArtworkIds.includes(artId) : false;
  const shouldGreyImage = isPreviewGreyed || isCurrentArtworkLocked;

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
          <div className={`${styles.imageCol} ${shouldGreyImage ? styles.imageGreyed : ''}`}>
            <CardEffects
              imageSrc={getCardImageUrl(card.id, 'full', artId)}
              alt={displayName}
              rarity={card.rarity ?? undefined}
              isGhost={previewGhost}
              isMisprint={previewMisprint}
              misprintData={activeMisprintData}
            />
          </div>
          <div className={styles.infoCol}>
            <h3 className={styles.name}>{displayName}</h3>
            {secondaryName !== displayName && (
              <span className={styles.secondaryName}>{secondaryName}</span>
            )}

            {/* Availability badges — artwork-specific when artworks loaded, otherwise card-level sets */}
            {activeArtwork && artworks && artworks.length > 1 ? (
              <div className={styles.availabilityBadge}>
                {activeArtwork.availableIn ? (
                  activeArtwork.availableIn.split(', ').map((setName) => {
                    const setInfo = card.sets?.find((s) => s.name === setName.trim());
                    const isActive = setInfo ? setInfo.active !== false : false;
                    return (
                      <span
                        key={setName}
                        className={`${isActive ? styles.badgeAvailable : styles.badgeUnavailable} ${onSetClick ? styles.badgeClickable : ''}`}
                        onClick={onSetClick ? () => { onClose(); onSetClick(setName.trim()); } : undefined}
                      >
                        {setName.trim()}
                      </span>
                    );
                  })
                ) : (
                  <span className={styles.badgeUnavailable}>{t('cardDetail.notAvailable')}</span>
                )}
              </div>
            ) : card.sets !== undefined ? (
              <div className={styles.availabilityBadge}>
                {card.sets && card.sets.length > 0 ? (
                  card.sets.map((s) => (
                    <span
                      key={s.code ?? s.name}
                      className={`${s.active !== false ? styles.badgeAvailable : styles.badgeUnavailable} ${onSetClick ? styles.badgeClickable : ''}`}
                      onClick={onSetClick ? () => { onClose(); onSetClick(s.name); } : undefined}
                    >
                      {s.name}
                    </span>
                  ))
                ) : (
                  <span className={styles.badgeUnavailable}>{t('cardDetail.notAvailable')}</span>
                )}
              </div>
            ) : null}

            <div className={styles.typeLine}>
              {(card.type || card.frameType) && (
                <span className={styles.typeTag}>{card.type ?? card.frameType}</span>
              )}
              {card.rarity && (
                <span className={`${styles.rarityBadge} ${rarityClass(card.rarity)}`}>
                  {card.rarity}
                </span>
              )}
              <span className={`${styles.banBadge} ${styles[`ban${(card.banStatus ?? 'Unlimited').replace('-', '')}`]}`}>
                {t(`banStatus.${card.banStatus ?? 'Unlimited'}`)}
              </span>
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

            {/* Artwork gallery — always show (even with 1 artwork) */}
            {artworks && artworks.length > 0 && (
              <div className={styles.artworkSection}>
                <span className={styles.artworkTitle}>Artworks ({artworks.length})</span>
                <div className={styles.artworkGrid}>
                  {artworks.map((art) => {
                    const owned = !ownedArtworkIds || ownedArtworkIds.includes(art.artworkId);
                    return (
                      <div
                        key={art.artworkId}
                        className={`${styles.artworkThumb} ${art.artworkId === artId ? styles.artworkActive : ''} ${!owned ? styles.artworkLocked : ''}`}
                        title={!owned ? t('cardDetail.artworkLocked') : undefined}
                        onClick={() => {
                          setPreviewArtId(art.artworkId);
                          setPreviewGhost(false);
                          setPreviewMisprint(false);
                          if (owned) {
                            onArtworkChange?.(art.artworkId);
                          } else {
                            onPreviewArtworkChange?.(art.artworkId);
                          }
                        }}
                      >
                        <img src={getCardImageUrl(card.id, 'small', art.artworkId)} alt="" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Effect variant toggles — Ghost / Misprint */}
            {showEffectToggles && (
              <div className={styles.artworkSection}>
                <span className={styles.artworkTitle}>{t('cardDetail.effects', 'Effekte')}</span>
                <div className={styles.effectGrid}>
                  <button
                    className={`${styles.effectToggle} ${!previewGhost && !previewMisprint ? styles.effectActive : ''}`}
                    onClick={() => { setPreviewGhost(false); setPreviewMisprint(false); }}
                  >
                    Normal
                  </button>
                  {(ghostEligible || effectPreviewMode) && (
                    <button
                      className={`${styles.effectToggle} ${previewGhost && !previewMisprint ? styles.effectActive : ''} ${!canGhost && !effectPreviewMode ? styles.effectLocked : ''}`}
                      onClick={() => { setPreviewGhost(true); setPreviewMisprint(false); }}
                      title={!canGhost && !effectPreviewMode ? t('cardDetail.effectLocked', 'Noch nicht freigeschaltet') : undefined}
                    >
                      Ghost
                    </button>
                  )}
                  <button
                    className={`${styles.effectToggle} ${previewMisprint && !previewGhost ? styles.effectActive : ''} ${!canMisprint && !effectPreviewMode ? styles.effectLocked : ''}`}
                    onClick={() => { setPreviewGhost(false); setPreviewMisprint(true); if (effectPreviewMode) setPreviewMisprintData(generatePreviewMisprintData()); }}
                    title={!canMisprint && !effectPreviewMode ? t('cardDetail.effectLocked', 'Noch nicht freigeschaltet') : undefined}
                  >
                    Misprint
                  </button>
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
