/**
 * DeckbuilderPage — "Meine Sammlung" page with deck builder + card pool.
 * Logic is extracted into useDeckbuilder + useDeckDrag hooks.
 * UI is composed from DeckPanel, DeckCardPopup, DeckModals sub-components.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { useAppData } from '../store/AppDataContext';
import { useDeckbuilder } from '../hooks/useDeckbuilder';
import { useDeckDrag } from '../hooks/useDeckDrag';
import { getCardImageUrl } from '../services/cardApi';
import type { Card, OwnedCard } from '../types/card';
import { SearchBar, type ViewMode } from '../components/cardBrowser/SearchBar';
import { CardGrid } from '../components/cardBrowser/CardGrid';
import { CardTable } from '../components/cardBrowser/CardTable';
import { DeckPanel } from './deckbuilder/DeckPanel';
import { DeckCardPopup } from './deckbuilder/DeckCardPopup';
import { ConfirmModal, NewDeckModal } from './deckbuilder/DeckModals';
import styles from './DeckbuilderPage.module.css';

export function DeckbuilderPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sets } = useAppData();
  const deck = useDeckbuilder();

  const drag = useDeckDrag({
    addCard: deck.addCard,
    removeFromMain: deck.removeFromMain,
    removeFromExtra: deck.removeFromExtra,
    findCard: (id) => deck.collection.find((c) => c.id === id) ?? deck.getCardById(id),
  });

  // Pool filters (local to this page)
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [attributeFilter, setAttributeFilter] = useState('all');
  const [setFilter, setSetFilter] = useState('all');
  const [banFilter, setBanFilter] = useState('all');
  const [deckFilter, setDeckFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Popup state
  const [popupCard, setPopupCard] = useState<Card | null>(null);
  const [popupPreviewArtId, setPopupPreviewArtId] = useState<number | null>(null);
  const [popupCopyInfo, setPopupCopyInfo] = useState<{ deckType: 'main' | 'extra'; index: number } | null>(null);

  // Deck card IDs set for pool filtering
  const deckCardIds = useMemo(() => {
    const ids = new Set<number>();
    for (const c of [...deck.mainDeck, ...deck.extraDeck]) ids.add(c.cardId);
    return ids;
  }, [deck.mainDeck, deck.extraDeck]);

  const filteredPool = useMemo(() => {
    let result: OwnedCard[] = deck.collection;
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) || (c.name_en?.toLowerCase().includes(q) ?? false)
      );
    }
    if (typeFilter !== 'all') result = result.filter((c) => c.frameType === typeFilter);
    if (attributeFilter !== 'all') {
      const [kind, value] = attributeFilter.split(':');
      if (kind === 'attr') result = result.filter((c) => c.attribute === value);
      else if (kind === 'race') result = result.filter((c) => c.race === value || c.race_en === value);
    }
    if (setFilter !== 'all') {
      // Show all owned cards that exist in this set (even if user lacks the set's artwork)
      result = result.filter((c) => c.sets?.some((s) => s.name === setFilter) ?? false);
    }
    if (banFilter !== 'all') {
      result = banFilter === 'Unlimited'
        ? result.filter((c) => !c.banStatus)
        : result.filter((c) => c.banStatus === banFilter);
    }
    if (deckFilter === 'inDeck') {
      result = result.filter((c) => deckCardIds.has(c.id));
    } else if (deckFilter === 'notInDeck') {
      result = result.filter((c) => !deckCardIds.has(c.id));
    }
    return result;
  }, [deck.collection, search, typeFilter, attributeFilter, setFilter, banFilter, deckFilter, deckCardIds]);

  /** Open popup from pool — no specific copy targeted. */
  function openPoolPopup(card: Card) {
    if (setFilter !== 'all') {
      const setEntry = card.sets?.find((s) => s.name === setFilter);
      setPopupPreviewArtId(setEntry?.artworkId ?? deck.userPrefs.get(card.id) ?? null);
    } else {
      setPopupPreviewArtId(deck.userPrefs.get(card.id) ?? null);
    }
    setPopupCopyInfo(null);
    setPopupCard(card);
  }

  /** Open popup from a deck row — specific copy targeted for artwork editing. */
  function openDeckPopup(card: Card, deckType: 'main' | 'extra', firstIndex: number) {
    const copies = deckType === 'main' ? deck.mainDeck : deck.extraDeck;
    const copy = copies[firstIndex];
    const artId = copy ? deck.resolveArtwork(copy) : null;
    setPopupPreviewArtId(artId);
    setPopupCopyInfo({ deckType, index: firstIndex });
    setPopupCard(card);
  }

  if (!user) {
    return <div className={styles.page}><p className={styles.loginHint}>{t('deckbuilder.loginRequired')}</p></div>;
  }

  // Resolve the current artwork for the popup card (for initial display)
  const popupCurrentArtworkId = popupCard
    ? (popupCopyInfo
        ? deck.resolveArtwork((popupCopyInfo.deckType === 'main' ? deck.mainDeck : deck.extraDeck)[popupCopyInfo.index] ?? { cardId: popupCard.id, artworkId: null })
        : deck.userPrefs.get(popupCard.id) ?? null)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left: Deck */}
        <div className={styles.deckColumn} data-drop="deck">
          <DeckPanel
            decks={deck.decks}
            activeDeckId={deck.activeDeckId}
            mainDeck={deck.mainDeck}
            extraDeck={deck.extraDeck}
            resolveArtwork={deck.resolveArtwork}
            deckLoading={deck.deckLoading}
            error={deck.error}
            deckTypeCounts={deck.deckTypeCounts}
            dragCardId={drag.dragCardId}
            dragFromDeck={drag.dragFromDeck}
            dragIsFusion={drag.dragIsFusion}
            onSelectDeck={deck.selectDeck}
            onDeleteDeck={deck.handleDeleteDeck}
            onNewDeck={deck.handleNewDeck}
            onClearDeck={deck.clearDeck}
            onCardClick={openDeckPopup}
            onRemoveCard={(type, index) => type === 'main' ? deck.removeFromMain(index) : deck.removeFromExtra(index)}
            onStartDrag={drag.startDrag}
            getCardById={deck.getCardById}
          />
        </div>

        {/* Right: Card pool — shows user-preferred artworks */}
        <div className={styles.poolPanel} data-drop="pool">
          <SearchBar
            query={search}
            onQueryChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={(v) => { setTypeFilter(v); setAttributeFilter('all'); }}
            attributeFilter={attributeFilter}
            onAttributeFilterChange={setAttributeFilter}
            setFilter={setFilter}
            onSetFilterChange={setSetFilter}
            sets={sets.filter((s) => s.active)}
            availabilityFilter={deckFilter}
            onAvailabilityFilterChange={setDeckFilter}
            availabilityOptions={[
              { value: 'all', label: t('cards.allCards') },
              { value: 'inDeck', label: t('deckbuilder.inDeck') },
              { value: 'notInDeck', label: t('deckbuilder.notInDeck') },
            ]}
            banFilter={banFilter}
            onBanFilterChange={setBanFilter}
            resultCount={filteredPool.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {deck.inventoryLoading ? (
            <div className={styles.poolLoading}>{t('common.loading')}</div>
          ) : deck.collection.length === 0 ? (
            <div className={styles.poolEmpty}>
              <p>{t('inventory.noCardsOwned')}</p>
              <a href="/app/shop" className={styles.poolEmptyLink}>{t('inventory.goToShop')}</a>
            </div>
          ) : viewMode === 'grid' ? (
            <CardGrid
              cards={filteredPool}
              onCardClick={openPoolPopup}
              onCardDragStart={drag.startDrag}
              isCardMaxed={(id) => deck.getAvailable(id) <= 0}
              isCardGreyed={setFilter !== 'all' ? (id) => {
                const card = filteredPool.find((c) => c.id === id);
                if (!card) return false;
                const setEntry = card.sets?.find((s) => s.name === setFilter);
                if (!setEntry?.artworkId) return false;
                return !(card.unlockedArtworks?.includes(setEntry.artworkId) ?? false);
              } : undefined}
              artworkPrefs={deck.userPrefs}
              effectPrefs={deck.effectPrefs}
              setFilter={setFilter}
              ignoreAvailability
            />
          ) : (
            <CardTable
              cards={filteredPool}
              onCardClick={openPoolPopup}
              onCardDragStart={drag.startDrag}
              isCardMaxed={(id) => deck.getAvailable(id) <= 0}
            />
          )}
        </div>
      </div>

      {/* Card popup */}
      {popupCard && (
        <DeckCardPopup
          card={popupCard}
          popupPreviewArtId={popupPreviewArtId}
          setFilter={setFilter}
          currentArtworkId={popupCurrentArtworkId}
          collection={deck.collection}
          cardCounts={deck.cardCounts}
          activeDeckId={deck.activeDeckId}
          mainDeckLength={deck.mainDeck.length}
          extraDeckLength={deck.extraDeck.length}
          mainDeck={deck.mainDeck}
          extraDeck={deck.extraDeck}
          copyInfo={popupCopyInfo}
          onClose={() => { setPopupCard(null); setPopupPreviewArtId(null); setPopupCopyInfo(null); }}
          onPreviewArtworkChange={setPopupPreviewArtId}
          onArtworkChange={(artworkId) => {
            if (popupCopyInfo) {
              // Per-copy artwork change (clicked from deck row)
              deck.setArtworkForCopy(popupCopyInfo.deckType, popupCopyInfo.index, artworkId);
            } else if (deck.activeDeckId) {
              // No specific copy — no-op (user should click the deck row to change copy artwork)
              // But still useful: sets user preferred for future adds
              deck.setPreferredArtwork(popupCard.id, artworkId);
            } else {
              // No deck active — change user preferred
              deck.setPreferredArtwork(popupCard.id, artworkId);
            }
          }}
          onAddCard={deck.addCard}
          onRemoveFromMain={deck.removeFromMain}
          onRemoveFromExtra={deck.removeFromExtra}
          getAvailable={deck.getAvailable}
        />
      )}

      {/* Drag ghost */}
      {drag.dragCardId !== null && drag.dragPos && (
        <div className={styles.dragGhost} style={{ left: drag.dragPos.x, top: drag.dragPos.y }}>
          <img src={getCardImageUrl(drag.dragCardId)} alt="" draggable={false} />
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        confirmAction={deck.confirmAction}
        onClose={() => deck.setConfirmAction(null)}
        onConfirm={deck.handleConfirm}
      />
      <NewDeckModal
        open={deck.newDeckOpen}
        name={deck.newDeckName}
        error={deck.newDeckError}
        onClose={() => deck.setNewDeckOpen(false)}
        onNameChange={deck.handleDeckNameChange}
        onSubmit={deck.doCreateDeck}
      />
    </div>
  );
}
