/**
 * CardDetail — public card browser detail popup.
 * Uses the shared CardDetailPopup component + loads artworks from API.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from '../../types/card';
import { useCardLocale } from '../../hooks/useCardLocale';
import { env } from '../../config/env';
import { CardDetailPopup, type ArtworkOption } from '../common/CardDetailPopup';

interface CardDetailProps {
  card: Card;
  onClose: () => void;
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const { t } = useTranslation();
  const { localize } = useCardLocale();
  const loc = localize(card);
  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);

  // Load artworks from API
  useEffect(() => {
    setArtworks([]);
    async function load() {
      try {
        const res = await fetch(`${env.api.baseUrl}/cards/${card.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.artworks && data.artworks.length > 1) {
            setArtworks(data.artworks);
          }
        }
      } catch { /* ignore */ }
    }
    load();
  }, [card.id]);

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
      }}
      onClose={onClose}
      artworks={artworks}
    >
      {/* Set membership info */}
      {card.card_sets && card.card_sets.length > 0 && (
        <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(0,220,168,0.08)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>
            {t('cardDetail.containedIn')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {card.card_sets.slice(0, 8).map((set, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-heading)', fontSize: '0.5rem', color: 'var(--orichalcos-light)', padding: '2px 6px', border: '1px solid rgba(0,220,168,0.15)', letterSpacing: '0.5px' }}>
                {set.set_name}
              </span>
            ))}
            {card.card_sets.length > 8 && (
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                {t('cardDetail.more', { count: card.card_sets.length - 8 })}
              </span>
            )}
          </div>
        </div>
      )}
    </CardDetailPopup>
  );
}
