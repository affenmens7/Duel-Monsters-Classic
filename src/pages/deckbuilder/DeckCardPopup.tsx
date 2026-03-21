/**
 * DeckCardPopup — card detail popup with inventory info and add/remove deck actions.
 * Supports per-copy artwork changes when a specific copy is targeted.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useSession } from '../../store/SessionContext';
import { useCardLocale } from '../../hooks/useCardLocale';
import { env } from '../../config/env';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import { cardToDetailData } from '../../utils/cardAdapter';
import type { Card, OwnedCard } from '../../types/card';
import type { DeckCopy } from '../../services/deckApi';
import styles from './DeckCardPopup.module.css';

interface DeckCardPopupProps {
  card: Card;
  popupPreviewArtId: number | null;
  setFilter: string;
  currentArtworkId: number | null;
  collection: OwnedCard[];
  cardCounts: Map<number, number>;
  activeDeckId: number | null;
  mainDeckLength: number;
  extraDeckLength: number;
  /** Which specific copy is being edited (from clicking a deck row). null = opened from pool. */
  copyInfo: { deckType: 'main' | 'extra'; index: number } | null;
  onClose: () => void;
  onPreviewArtworkChange: (artworkId: number) => void;
  onArtworkChange: (artworkId: number) => void;
  onAddCard: (card: Card, artworkId?: number | null) => void;
  onRemoveFromMain: (index: number) => void;
  onRemoveFromExtra: (index: number) => void;
  getAvailable: (cardId: number) => number;
  mainDeck: DeckCopy[];
  extraDeck: DeckCopy[];
}

export function DeckCardPopup({
  card, popupPreviewArtId, setFilter, currentArtworkId, collection,
  cardCounts, activeDeckId, mainDeckLength, extraDeckLength,
  copyInfo,
  onClose, onPreviewArtworkChange, onArtworkChange,
  onAddCard, onRemoveFromMain, onRemoveFromExtra,
  getAvailable, mainDeck, extraDeck,
}: DeckCardPopupProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { localize } = useCardLocale();

  const ownedCard = collection.find((c) => c.id === card.id);
  const { inventory, refreshInventory } = useSession();
  const invEntry = inventory.get(card.id);
  const inDeck = cardCounts.get(card.id) ?? 0;

  const isForbidden = card.banStatus === 'Forbidden';
  const noAvail = getAvailable(card.id) <= 0;
  const isFusion = card.frameType === 'fusion';
  const deckFull = isFusion ? extraDeckLength >= 15 : mainDeckLength >= 60;
  const hasMultipleArtworks = (card.artworkIds ?? []).length > 1;
  const previewArtNotOwned = hasMultipleArtworks
    && popupPreviewArtId != null
    && !(ownedCard?.unlockedArtworks?.includes(popupPreviewArtId) ?? false);
  const addDisabled = !activeDeckId || isForbidden || noAvail || deckFull || previewArtNotOwned;
  const displayedArt = popupPreviewArtId ?? currentArtworkId;
  const hasAnyInDeck = inDeck > 0;
  const artworkInDeck = displayedArt != null
    ? mainDeck.some((c) => c.cardId === card.id && c.artworkId === displayedArt) ||
      extraDeck.some((c) => c.cardId === card.id && c.artworkId === displayedArt)
    : hasAnyInDeck;
  const removeDisabled = !artworkInDeck;
  const addHint = !activeDeckId ? t('deckbuilder.noDeckSelected')
    : isForbidden ? t('banStatus.Forbidden')
    : previewArtNotOwned ? t('deckbuilder.artworkNotOwned')
    : noAvail ? t('deckbuilder.copyLimitReached')
    : deckFull ? (isFusion ? t('deckbuilder.extraDeckFull') : t('deckbuilder.mainDeckFull'))
    : '';

  return (
    <CardDetailPopup
      card={cardToDetailData(card, localize(card))}
      onClose={onClose}
      currentArtworkId={popupPreviewArtId ?? currentArtworkId}
      onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
      artworks={(card.artworkIds ?? []).length > 0
        ? (card.artworkIds ?? []).map((aId, i) => ({
            artworkId: aId,
            label: i === 0 ? 'Original' : `Artwork ${i + 1}`,
            imagePath: `/images/cards/${aId}.jpg`,
            isDefault: i === 0,
            availableIn: card.sets
              ?.filter((s) => s.active !== false && s.artworkId === aId)
              .map((s) => s.name)
              .join(', ') || null,
          }))
        : undefined
      }
      artworkVariants={invEntry?.artworkVariants?.map((v) => ({
        artworkId: v.artworkId,
        isGhost: v.isGhost,
        isMisprint: v.isMisprint,
        misprintData: v.misprintData as Record<string, unknown> | undefined,
      }))}
      initialGhost={invEntry?.preferredEffect === 'ghost'}
      initialMisprint={invEntry?.preferredEffect === 'misprint'}
      onGhostChange={async (isGhost) => {
        if (!token) return;
        const effect = isGhost ? 'ghost' : null;
        try {
          await fetch(`${env.api.baseUrl}/user/collection${card.id}/effect`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ effect }),
          });
          refreshInventory?.();
        } catch { /* ignore */ }
      }}
      onMisprintChange={async (isMisprint) => {
        if (!token) return;
        const effect = isMisprint ? 'misprint' : null;
        try {
          await fetch(`${env.api.baseUrl}/user/collection${card.id}/effect`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ effect }),
          });
          refreshInventory?.();
        } catch { /* ignore */ }
      }}
      isPreviewGreyed={
        popupPreviewArtId != null &&
        !(ownedCard?.unlockedArtworks?.includes(popupPreviewArtId) ?? false)
      }
      onPreviewArtworkChange={onPreviewArtworkChange}
      onArtworkChange={(artworkId) => {
        onPreviewArtworkChange(artworkId);
        if (setFilter === 'all') {
          onArtworkChange(artworkId);
          // Only PATCH user-preferred artwork when no deck is active and no copy targeted
          if (!activeDeckId && !copyInfo && token) {
            fetch(`${env.api.baseUrl}/user/collection/${card.id}/artwork`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ artworkId }),
            }).catch(() => {});
          }
        }
      }}
      ownedArtworkIds={ownedCard?.unlockedArtworks}
    >
      {/* Inventory info */}
      {ownedCard && (
        <div className={styles.inventoryInfo}>
          <span>{t('inventory.owned')}: {ownedCard.owned}</span>
          {inDeck > 0 && <span>{t('inventory.inDeck')}: {inDeck}</span>}
        </div>
      )}
      {/* Action buttons */}
      <div className={styles.actionRow}>
        <button
          className={styles.addBtn}
          onClick={() => onAddCard(card, popupPreviewArtId)}
          disabled={addDisabled}
          title={addHint}
          style={{ opacity: addDisabled ? 0.4 : 1, cursor: addDisabled ? 'not-allowed' : 'pointer' }}
        >
          {t('deckbuilder.addToDeck')}
        </button>
        <button
          className={styles.removeBtn}
          onClick={() => {
            if (removeDisabled) return;
            // If a specific copy is targeted, remove that one
            if (copyInfo) {
              if (copyInfo.deckType === 'main') onRemoveFromMain(copyInfo.index);
              else onRemoveFromExtra(copyInfo.index);
              return;
            }
            // Remove the copy matching the currently displayed artwork
            const displayedArt = popupPreviewArtId ?? currentArtworkId;
            const mainIdx = displayedArt != null
              ? findLastIndex(mainDeck, (c) => c.cardId === card.id && c.artworkId === displayedArt)
              : -1;
            const extraIdx = displayedArt != null
              ? findLastIndex(extraDeck, (c) => c.cardId === card.id && c.artworkId === displayedArt)
              : -1;
            // Fallback: if no exact artwork match, remove any copy of this card
            if (mainIdx >= 0) onRemoveFromMain(mainIdx);
            else if (extraIdx >= 0) onRemoveFromExtra(extraIdx);
            else {
              const anyMain = findLastIndex(mainDeck, (c) => c.cardId === card.id);
              const anyExtra = findLastIndex(extraDeck, (c) => c.cardId === card.id);
              if (anyMain >= 0) onRemoveFromMain(anyMain);
              else if (anyExtra >= 0) onRemoveFromExtra(anyExtra);
            }
          }}
          disabled={removeDisabled}
          style={{ opacity: removeDisabled ? 0.4 : 1, cursor: removeDisabled ? 'not-allowed' : 'pointer' }}
        >
          {t('deckbuilder.removeFromDeck')}
        </button>
      </div>
    </CardDetailPopup>
  );
}

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
