/**
 * CardDetail — public card browser detail popup.
 * Waits for artwork details to load before showing the popup.
 * Set badges are passed via card.sets from AppDataContext cache.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Card } from '../../types/card';
import { useCardLocale } from '../../hooks/useCardLocale';
import { env } from '../../config/env';
import { CardDetailPopup, type ArtworkOption } from '../common/CardDetailPopup';
import styles from './CardDetail.module.css';

interface CardDetailProps {
  card: Card;
  setFilter?: string;
  onClose: () => void;
}

export function CardDetail({ card, setFilter, onClose }: CardDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localize } = useCardLocale();
  const loc = localize(card);
  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Load artwork details, then show popup
  useEffect(() => {
    setArtworks([]);
    const artworkIds = card.artworkIds ?? [];

    // Fetch artwork details from API (always — even with 1 artwork for effect toggles)
    setLoading(true);
    fetch(`${env.api.baseUrl}/cards/${card.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.artworks?.length > 0) {
          setArtworks(data.artworks);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [card.id, card.artworkIds]);

  // Show loading overlay while artworks are being fetched
  if (loading) {
    return (
      <div className={styles.loadingOverlay} onClick={onClose}>
        <div className={styles.loadingSpinner}>{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <CardDetailPopup
      card={{
        id: card.id,
        nameDe: card.name ?? '',
        nameEn: card.name_en ?? '',
        descDe: card.desc ?? '',
        descEn: card.desc_en ?? '',
        type: loc.type,
        frameType: card.frameType,
        atk: card.atk,
        def: card.def,
        level: card.level,
        attribute: card.attribute,
        race: loc.race,
        sets: card.sets,
        banStatus: card.banStatus,
        rarity: card.rarity,
        artworkId: card.artworkIds?.[0] ?? null,
      }}
      onClose={onClose}
      artworks={artworks}
      currentArtworkId={
        setFilter && setFilter !== 'all'
          ? card.sets?.find((s) => s.name === setFilter)?.artworkId ?? card.artworkIds?.[0] ?? null
          : card.artworkIds?.[0] ?? null
      }
      ownedArtworkIds={artworks.length > 0
        ? artworks.filter((a) => {
            if (!a.availableIn) return false;
            // Check if any set containing this artwork is purchasable (active badge)
            const setNames = a.availableIn.split(', ').map((s) => s.trim());
            return setNames.some((sn) => card.sets?.find((s) => s.name === sn)?.active);
          }).map((a) => a.artworkId)
        : undefined
      }
      isPreviewGreyed={!card.available}
      effectPreviewMode
      onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
    />
  );
}
