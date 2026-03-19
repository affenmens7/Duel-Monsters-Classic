/**
 * DeckPanel — list-based deck builder panel (Demo 5b style).
 * Shows cards grouped by type with compact rows, stats bar, and action footer.
 * Groups by (cardId + artworkId) so copies with different artworks show as separate rows.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCardImageUrl } from '../../services/cardApi';
import { useCardLocale } from '../../hooks/useCardLocale';
import type { Card } from '../../types/card';
import type { DeckSummary, DeckCopy } from '../../services/deckApi';
import styles from './DeckPanel.module.css';

interface DeckPanelProps {
  decks: DeckSummary[];
  activeDeckId: number | null;
  mainDeck: DeckCopy[];
  extraDeck: DeckCopy[];
  resolveArtwork: (copy: DeckCopy) => number | null;
  deckLoading: boolean;
  error: string;
  deckTypeCounts: { monsters: number; spells: number; traps: number };
  dragCardId: number | null;
  dragFromDeck: { type: 'main' | 'extra'; index: number } | null;
  dragIsFusion: boolean;
  onSelectDeck: (deckId: number) => void;
  onDeleteDeck: (id: number, name: string) => void;
  onNewDeck: () => void;
  onClearDeck: () => void;
  onCardClick: (card: Card, deckType: 'main' | 'extra', firstIndex: number) => void;
  onRemoveCard: (type: 'main' | 'extra', index: number) => void;
  onStartDrag: (cardId: number, e: React.MouseEvent, from?: { type: 'main' | 'extra'; index: number }) => void;
  getCardById: (id: number) => Card | undefined;
}

interface GroupEntry {
  card: Card;
  artworkId: number | null;
  qty: number;
  firstIndex: number;
}

/** Groups DeckCopy[] by (cardId + resolved artworkId). */
function groupCopies(
  copies: DeckCopy[],
  getCard: (id: number) => Card | undefined,
  resolveArtwork: (copy: DeckCopy) => number | null,
): GroupEntry[] {
  const seen = new Map<string, GroupEntry>();
  for (let i = 0; i < copies.length; i++) {
    const copy = copies[i];
    const card = getCard(copy.cardId);
    if (!card) continue;
    const artId = resolveArtwork(copy);
    const key = `${card.id}-${artId ?? 'default'}`;
    const existing = seen.get(key);
    if (existing) {
      existing.qty++;
    } else {
      seen.set(key, { card, artworkId: artId, qty: 1, firstIndex: i });
    }
  }
  return [...seen.values()];
}

function getTypeClass(frameType: string): string {
  switch (frameType) {
    case 'normal': return styles.typeNormal;
    case 'effect': return styles.typeEffect;
    case 'ritual': return styles.typeRitual;
    case 'fusion': return styles.typeFusion;
    case 'spell': return styles.typeSpell;
    case 'trap': return styles.typeTrap;
    default: return '';
  }
}

function getTypeLabel(frameType: string, t: (key: string) => string): string {
  switch (frameType) {
    case 'normal': return t('deckbuilder.filterNormal');
    case 'effect': return t('deckbuilder.filterEffect');
    case 'ritual': return t('deckbuilder.filterRitual');
    case 'fusion': return t('deckbuilder.filterFusion');
    case 'spell': return t('deckbuilder.filterSpell');
    case 'trap': return t('deckbuilder.filterTrap');
    default: return frameType;
  }
}

export function DeckPanel({
  decks, activeDeckId, mainDeck, extraDeck, resolveArtwork,
  deckLoading, error, deckTypeCounts,
  dragCardId, dragFromDeck, dragIsFusion,
  onSelectDeck, onDeleteDeck, onNewDeck, onClearDeck,
  onCardClick, onRemoveCard, onStartDrag, getCardById,
}: DeckPanelProps) {
  const { t } = useTranslation();
  const { localize } = useCardLocale();

  // Group main deck by type, sub-grouped by artwork
  const grouped = useMemo(() => {
    const all = groupCopies(mainDeck, getCardById, resolveArtwork);
    const monsters = all.filter((e) => !['spell', 'trap'].includes(e.card.frameType));
    const spells = all.filter((e) => e.card.frameType === 'spell');
    const traps = all.filter((e) => e.card.frameType === 'trap');
    return { monsters, spells, traps };
  }, [mainDeck, getCardById, resolveArtwork]);

  const extraGrouped = useMemo(
    () => groupCopies(extraDeck, getCardById, resolveArtwork),
    [extraDeck, getCardById, resolveArtwork],
  );

  const totalCards = mainDeck.length;
  const isReady = totalCards >= 40;
  const isDeckOpen = activeDeckId && !deckLoading;

  function renderCardRow(
    entry: GroupEntry,
    deckType: 'main' | 'extra',
  ) {
    const loc = localize(entry.card);
    return (
      <div
        key={`${deckType}-${entry.card.id}-${entry.artworkId ?? 'default'}`}
        className={styles.cardRow}
        onClick={() => onCardClick(entry.card, deckType, entry.firstIndex)}
        onMouseDown={(e) => { e.stopPropagation(); onStartDrag(entry.card.id, e, { type: deckType, index: entry.firstIndex }); }}
      >
        <img
          className={styles.cardThumb}
          src={getCardImageUrl(entry.card.id, 'small', entry.artworkId ?? undefined)}
          alt=""
          draggable={false}
        />
        <span className={styles.cardName}>{loc.name}</span>
        <span className={`${styles.cardType} ${getTypeClass(entry.card.frameType)}`}>
          {getTypeLabel(entry.card.frameType, t)}
        </span>
        <span className={styles.cardQty}>{entry.qty}</span>
        <button
          className={styles.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemoveCard(deckType, entry.firstIndex); }}
          title={t('deckbuilder.removeFromDeck')}
        >
          -
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{t('deckbuilder.title')}</h2>
        <button className={styles.newBtn} onClick={onNewDeck}>{t('deckbuilder.newDeck')}</button>
      </div>

      {/* Deck select dropdown */}
      <div className={styles.selectRow}>
        <select
          className={styles.deckSelect}
          value={activeDeckId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              onSelectDeck(activeDeckId!);
            } else {
              const id = parseInt(val, 10);
              if (!isNaN(id)) onSelectDeck(id);
            }
          }}
        >
          <option value="">{t('deckbuilder.noDeckSelected')}</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {activeDeckId && (
          <button
            className={styles.deleteBtn}
            onClick={() => {
              const deck = decks.find((d) => d.id === activeDeckId);
              if (deck) onDeleteDeck(deck.id, deck.name);
            }}
          >x</button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {deckLoading && <div className={styles.loading}>{t('common.loading')}</div>}

      {isDeckOpen && (
        <>
          {/* Stats bar */}
          <div className={styles.statsBar}>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statTotal}`}>{totalCards}</span>
              {t('deckbuilder.filterAll')}
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statMonster}`}>{deckTypeCounts.monsters}</span>
              {t('deckbuilder.monsters')}
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statSpell}`}>{deckTypeCounts.spells}</span>
              {t('deckbuilder.spells')}
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statTrap}`}>{deckTypeCounts.traps}</span>
              {t('deckbuilder.traps')}
            </div>
          </div>

          {/* Main Deck zone — highlight when dragging a non-fusion card */}
          <div className={`${styles.deckZone} ${dragCardId !== null && !dragIsFusion && !dragFromDeck ? styles.dropHighlight : ''}`}>
            {/* Monster section */}
            {grouped.monsters.length > 0 && (
              <>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{t('deckbuilder.monsters')} ({deckTypeCounts.monsters})</span>
                  <span className={`${styles.colLabel} ${styles.colLabelType}`}>{t('deckbuilder.colType')}</span>
                  <span className={`${styles.colLabel} ${styles.colLabelQty}`}>{t('deckbuilder.colQty')}</span>
                  <span className={styles.colRemove} />
                </div>
                {grouped.monsters.map((e) => renderCardRow(e, 'main'))}
              </>
            )}

            {/* Spell section */}
            {grouped.spells.length > 0 && (
              <>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{t('deckbuilder.spells')} ({deckTypeCounts.spells})</span>
                </div>
                {grouped.spells.map((e) => renderCardRow(e, 'main'))}
              </>
            )}

            {/* Trap section */}
            {grouped.traps.length > 0 && (
              <>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>{t('deckbuilder.traps')} ({deckTypeCounts.traps})</span>
                </div>
                {grouped.traps.map((e) => renderCardRow(e, 'main'))}
              </>
            )}

            {/* Empty main deck hint */}
            {totalCards === 0 && (
              <div className={styles.emptyHint}>
                {dragCardId !== null && !dragIsFusion ? t('deckbuilder.dropHere') : t('deckbuilder.noDeckSelected')}
              </div>
            )}
          </div>

          {/* Extra Deck zone — highlight when dragging a fusion card */}
          <div className={`${styles.deckZone} ${dragCardId !== null && dragIsFusion && !dragFromDeck ? styles.dropHighlight : ''}`}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>{t('deckbuilder.extraDeck')} ({extraDeck.length}/15)</span>
            </div>
            {extraGrouped.map((e) => renderCardRow(e, 'extra'))}

            {/* Empty extra deck hint */}
            {extraDeck.length === 0 && dragCardId !== null && dragIsFusion && (
              <div className={styles.emptyHint}>{t('deckbuilder.dropHere')}</div>
            )}
          </div>

          {/* Status + Clear */}
          <div className={`${styles.deckStatus} ${isReady ? styles.statusReady : styles.statusIncomplete}`}>
            <span>
              {isReady
                ? t('deckbuilder.ready', { count: totalCards })
                : t('deckbuilder.cardProgress', { count: totalCards })}
            </span>
            {(totalCards > 0 || extraDeck.length > 0) && (
              <button className={styles.clearBtn} onClick={onClearDeck}>{t('deckbuilder.clear')}</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
