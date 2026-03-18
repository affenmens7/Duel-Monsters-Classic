import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useCards } from '../store/CardContext';
import { useAppData } from '../store/AppDataContext';
import { useInventory } from '../store/InventoryContext';
import { useCardLocale } from '../hooks/useCardLocale';
import { getCardImageUrl } from '../services/cardApi';
import { fetchDecks, fetchDeck, createDeck, deleteDeck, saveDeckCards, type DeckSummary } from '../services/deckApi';
import type { Card, OwnedCard } from '../types/card';
import { SearchBar, type ViewMode } from '../components/cardBrowser/SearchBar';
import { CardGrid } from '../components/cardBrowser/CardGrid';
import { CardTable } from '../components/cardBrowser/CardTable';
import { CardDetailPopup } from '../components/common/CardDetailPopup';
import { Modal } from '../components/common/Modal';
import styles from './DeckbuilderPage.module.css';


export function DeckbuilderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards } = useCards();
  const { sets } = useAppData();
  const { collection, loading: inventoryLoading, refresh: refreshInventory } = useInventory();
  const { localize } = useCardLocale();

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);
  const [mainDeck, setMainDeck] = useState<number[]>([]);
  const [extraDeck, setExtraDeck] = useState<number[]>([]);
  const [artworkPrefs, setArtworkPrefs] = useState<Map<number, number>>(new Map());
  const [deckLoading, setDeckLoading] = useState(false);
  const deckCache = useRef<Map<number, { main: number[]; extra: number[] }>>(new Map());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [setFilter, setSetFilter] = useState('all');
  const [banFilter, setBanFilter] = useState('all');
  const [deckFilter, setDeckFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'clear'; deckId?: number; deckName?: string } | null>(null);

  // Track whether cards were changed by user (not by loadDeckCards)
  const [userEdited, setUserEdited] = useState(false);

  // Auto-save to backend on every edit + update cache
  useEffect(() => {
    if (activeDeckId && userEdited) {
      saveDeckCards(activeDeckId, mainDeck, extraDeck).catch(() => {});
      deckCache.current.set(activeDeckId, { main: mainDeck, extra: extraDeck });
      setUserEdited(false);
    }
  }, [activeDeckId, mainDeck, extraDeck, userEdited]);

  // Popup state
  const [popupCard, setPopupCard] = useState<Card | null>(null);

  // Drag state
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [dragFromDeck, setDragFromDeck] = useState<{ type: 'main' | 'extra'; index: number } | null>(null);
  const [dragIsFusion, setDragIsFusion] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // Load inventory once on mount (excludes current deck from usage calc)
  useEffect(() => {
    if (!user) return;
    refreshInventory(activeDeckId ?? undefined);
    // Only refresh on initial mount, not on every deck switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredPool = useMemo(() => {
    let result: OwnedCard[] = collection;
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_en?.toLowerCase().includes(q) ?? false)
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.frameType === typeFilter);
    }
    if (setFilter !== 'all') {
      result = result.filter((c) =>
        c.sets?.some((s) => s.name === setFilter)
      );
    }
    if (banFilter !== 'all') {
      if (banFilter === 'Unlimited') {
        result = result.filter((c) => !c.banStatus);
      } else {
        result = result.filter((c) => c.banStatus === banFilter);
      }
    }
    if (deckFilter === 'inDeck') {
      const deckIds = new Set([...mainDeck, ...extraDeck]);
      result = result.filter((c) => deckIds.has(c.id));
    } else if (deckFilter === 'notInDeck') {
      const deckIds = new Set([...mainDeck, ...extraDeck]);
      result = result.filter((c) => !deckIds.has(c.id));
    }
    return result;
  }, [collection, search, typeFilter, setFilter, banFilter, deckFilter, mainDeck, extraDeck]);


  const cardCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const id of [...mainDeck, ...extraDeck]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [mainDeck, extraDeck]);

  // Count card types — monsters only from main deck, spells/traps from main deck
  const deckTypeCounts = useMemo(() => {
    let normal = 0;
    let effect = 0;
    let ritual = 0;
    let spells = 0;
    let traps = 0;
    for (const id of mainDeck) {
      const card = collection.find((c) => c.id === id) ?? cards.find((c) => c.id === id);
      if (!card) continue;
      if (card.frameType === 'spell') spells++;
      else if (card.frameType === 'trap') traps++;
      else if (card.frameType === 'ritual') ritual++;
      else if (card.frameType === 'effect') effect++;
      else normal++;
    }
    return { normal, effect, ritual, spells, traps, monsters: normal + effect + ritual };
  }, [mainDeck, collection, cards]);

  useEffect(() => {
    if (!user) return;
    fetchDecks().then(setDecks).catch(() => {});
  }, [user]);

  async function loadDeckCards(deckId: number) {
    // Use cache if available
    const cached = deckCache.current.get(deckId);
    if (cached) {
      setMainDeck(cached.main);
      setExtraDeck(cached.extra);
      return;
    }

    setDeckLoading(true);
    try {
      const detail = await fetchDeck(deckId);
      const main: number[] = [];
      const extra: number[] = [];
      for (const c of detail.cards) {
        for (let i = 0; i < c.quantity; i++) {
          if (c.frame_type === 'fusion') {
            extra.push(c.card_id);
          } else {
            main.push(c.card_id);
          }
        }
      }
      deckCache.current.set(deckId, { main, extra });
      setMainDeck(main);
      setExtraDeck(extra);
    } catch {
      setMainDeck([]);
      setExtraDeck([]);
    } finally {
      setDeckLoading(false);
    }
  }

  // Get max allowed copies based on ban status
  const getMaxCopies = useCallback((card: Card | OwnedCard) => {
    switch (card.banStatus) {
      case 'Forbidden': return 0;
      case 'Limited': return 1;
      case 'Semi-Limited': return 2;
      default: return 3;
    }
  }, []);

  // Calculate how many copies can still be added to THIS deck
  const getAvailable = useCallback((cardId: number) => {
    const ownedCard = collection.find((c) => c.id === cardId);
    if (!ownedCard) return 0;
    const maxCopies = getMaxCopies(ownedCard);
    const inThisDeck = cardCounts.get(cardId) ?? 0;
    return Math.max(0, Math.min(maxCopies, ownedCard.owned) - inThisDeck);
  }, [collection, cardCounts, getMaxCopies]);

  const addCard = useCallback((card: Card) => {
    if (getAvailable(card.id) <= 0) return;
    if (card.frameType === 'fusion') {
      if (extraDeck.length >= 15) return;
      setExtraDeck((prev) => [...prev, card.id]);
    } else {
      if (mainDeck.length >= 60) return;
      setMainDeck((prev) => [...prev, card.id]);
    }
    setUserEdited(true);
  }, [getAvailable, mainDeck.length, extraDeck.length]);

  function removeFromMain(index: number) {
    setMainDeck(mainDeck.filter((_, i) => i !== index));
    setUserEdited(true);
  }

  function removeFromExtra(index: number) {
    setExtraDeck(extraDeck.filter((_, i) => i !== index));
    setUserEdited(true);
  }

  function clearDeck() {
    setConfirmAction({ type: 'clear' });
  }

  function doClearDeck() {
    setMainDeck([]);
    setExtraDeck([]);
    setUserEdited(true);
    setConfirmAction(null);
  }

  function openPoolPopup(card: Card) {
    setPopupCard(card);
  }

  function openDeckPopup(card: Card) {
    setPopupCard(card);
  }


  // Custom drag & drop — card follows cursor, with click threshold
  function startDrag(cardId: number, e: React.MouseEvent, from?: { type: 'main' | 'extra'; index: number }) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    const card = collection.find((c) => c.id === cardId) ?? cards.find((c) => c.id === cardId);

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!isDragging && Math.abs(dx) + Math.abs(dy) > 6) {
        isDragging = true;
        setDragCardId(cardId);
        setDragFromDeck(from ?? null);
        setDragIsFusion(card?.frameType === 'fusion');
      }
      if (isDragging) {
        setDragPos({ x: ev.clientX, y: ev.clientY });
      }
    }

    function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (!isDragging) {
        // It was a click, not a drag — let onClick handle it
        setDragCardId(null);
        setDragFromDeck(null);
        setDragPos(null);
        return;
      }

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const deckPanel = target?.closest('[data-drop="deck"]');
      const poolPanel = target?.closest('[data-drop="pool"]');

      if (deckPanel && !from) {
        if (card) addCard(card);
      } else if (poolPanel && from) {
        if (from.type === 'main') {
          removeFromMain(from.index);
        } else {
          removeFromExtra(from.index);
        }
      }

      setDragCardId(null);
      setDragFromDeck(null);
      setDragPos(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function handleNewDeck() {
    if (!user) return;
    const name = prompt(t('deckbuilder.deckNamePrompt'));
    if (!name) return;
    try {
      const deck = await createDeck(name);
      setDecks([...decks, { ...deck, card_count: '0', created_at: '', updated_at: '' }]);
      setActiveDeckId(deck.id);
      setMainDeck([]);
      setExtraDeck([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  function handleDeleteDeck(id: number, name: string) {
    setConfirmAction({ type: 'delete', deckId: id, deckName: name });
  }

  async function doDeleteDeck(id: number) {
    try {
      await deleteDeck(id);
      setDecks(decks.filter((d) => d.id !== id));
      deckCache.current.delete(id);
      if (activeDeckId === id) {
        setActiveDeckId(null);
        setMainDeck([]);
        setExtraDeck([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
    setConfirmAction(null);
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === 'clear') {
      doClearDeck();
    } else if (confirmAction.type === 'delete' && confirmAction.deckId) {
      doDeleteDeck(confirmAction.deckId);
    }
  }

  function getCardById(id: number): Card | undefined {
    return cards.find((c) => c.id === id);
  }

  if (!user) {
    return <div className={styles.page}><p className={styles.loginHint}>{t('deckbuilder.loginRequired')}</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left: Deck */}
        <div className={styles.deckColumn} data-drop="deck">
        <div className={styles.deckPanel}>
          <div className={styles.deckHeader}>
            <h2 className={styles.deckTitle}>{t('deckbuilder.title')}</h2>
            <div className={styles.deckActions}>
              <button className={styles.newBtn} onClick={handleNewDeck}>{t('deckbuilder.newDeck')}</button>
            </div>
          </div>

          <div className={styles.deckList}>
            {decks.map((d) => (
              <div
                key={d.id}
                className={`${styles.deckItem} ${activeDeckId === d.id ? styles.deckItemActive : ''}`}
                onClick={() => {
                  if (activeDeckId === d.id) {
                    setActiveDeckId(null);
                    setMainDeck([]);
                    setExtraDeck([]);
                  } else {
                    setActiveDeckId(d.id);
                    loadDeckCards(d.id);
                  }
                }}
              >
                <span className={styles.deckItemName}>{d.name}</span>
                <button className={styles.deckItemDelete} onClick={(e) => { e.stopPropagation(); handleDeleteDeck(d.id, d.name); }}>x</button>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {deckLoading && <div className={styles.deckLoadingHint}>{t('common.loading')}</div>}

          <div className={`${styles.deckContent} ${activeDeckId && !deckLoading ? styles.deckContentOpen : ''}`}>
            <div className={styles.deckContentInner}>
              <div className={styles.deckSection}>
                <div className={styles.deckSectionHeader}>
                  <span>{t('deckbuilder.mainDeck')} ({mainDeck.length}/40-60)</span>
                  <button className={styles.clearBtn} onClick={clearDeck}>{t('deckbuilder.clear')}</button>
                </div>
                <div className={styles.deckTypeStats}>
                  <span className={styles.statMonster}>{t('deckbuilder.monsters')}: {deckTypeCounts.monsters}</span>
                  <span className={styles.statSpell}>{t('deckbuilder.spells')}: {deckTypeCounts.spells}</span>
                  <span className={styles.statTrap}>{t('deckbuilder.traps')}: {deckTypeCounts.traps}</span>
                </div>
                <div className={`${styles.deckGrid} ${dragCardId && !dragFromDeck && !dragIsFusion ? styles.deckGridDropTarget : ''}`} data-drop="deck">
                  {mainDeck.map((cardId, i) => {
                    const card = getCardById(cardId);
                    return (
                      <div
                        key={`m-${i}`}
                        className={styles.deckCard}
                        onClick={() => card && openDeckPopup(card)}
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(cardId, e, { type: 'main', index: i }); }}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId, 'small', artworkPrefs.get(cardId))} alt="" draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.deckSection}>
                <span>{t('deckbuilder.extraDeck')} ({extraDeck.length}/15)</span>
                <div className={`${styles.deckGrid} ${dragCardId && !dragFromDeck && dragIsFusion ? styles.deckGridDropTarget : ''}`} data-drop="deck">
                  {extraDeck.map((cardId, i) => {
                    const card = getCardById(cardId);
                    return (
                      <div
                        key={`e-${i}`}
                        className={styles.deckCard}
                        onClick={() => card && openDeckPopup(card)}
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(cardId, e, { type: 'extra', index: i }); }}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId, 'small', artworkPrefs.get(cardId))} alt="" draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${styles.deckStatus} ${mainDeck.length >= 40 ? styles.deckStatusReady : ''}`}>
                {mainDeck.length >= 40
                  ? t('deckbuilder.ready', { count: mainDeck.length })
                  : t('deckbuilder.cardProgress', { count: mainDeck.length })}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Right: Card pool — uses same components as Public Database */}
        <div className={styles.poolPanel} data-drop="pool">
          <SearchBar
            query={search}
            onQueryChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
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

          {inventoryLoading ? (
            <div className={styles.poolLoading}>{t('common.loading')}</div>
          ) : collection.length === 0 ? (
            <div className={styles.poolEmpty}>
              <p>{t('inventory.noCardsOwned')}</p>
              <a href="/app/shop" className={styles.poolEmptyLink}>{t('inventory.goToShop')}</a>
            </div>
          ) : viewMode === 'grid' ? (
            <CardGrid
              cards={filteredPool}
              onCardClick={openPoolPopup}
              isCardMaxed={(id) => getAvailable(id) <= 0}
            />
          ) : (
            <CardTable
              cards={filteredPool}
              onCardClick={openPoolPopup}
              isCardMaxed={(id) => getAvailable(id) <= 0}
            />
          )}
        </div>
      </div>

      {/* Card popup */}
      {popupCard && (
        <CardDetailPopup
          card={{
            id: popupCard.id,
            nameDe: popupCard.name ?? '',
            nameEn: popupCard.name_en ?? '',
            descDe: popupCard.desc ?? '',
            descEn: popupCard.desc_en ?? '',
            type: localize(popupCard).type,
            frameType: popupCard.frameType,
            atk: popupCard.atk,
            def: popupCard.def,
            level: popupCard.level,
            attribute: popupCard.attribute,
            sets: popupCard.sets,
            banStatus: popupCard.banStatus,
          }}
          onClose={() => setPopupCard(null)}
          onSetClick={(setName) => navigate(`/app/cards?set=${encodeURIComponent(setName)}`)}
          artworks={(popupCard.artworkIds ?? []).length > 1
            ? (popupCard.artworkIds ?? []).map((aId, i) => ({
                artworkId: aId,
                label: i === 0 ? 'Original' : `Artwork ${i + 1}`,
                imagePath: `/images/cards/${aId}.jpg`,
                isDefault: i === 0,
              }))
            : undefined
          }
          onArtworkChange={(artworkId) => {
            setArtworkPrefs((prev) => {
              const next = new Map(prev);
              next.set(popupCard.id, artworkId);
              return next;
            });
          }}
          ownedArtworkIds={
            popupCard.sets
              ?.filter((s) => s.active && s.artworkId != null)
              .map((s) => s.artworkId!)
              .filter((v, i, a) => a.indexOf(v) === i)
          }
        >
          {/* Inventory info */}
          {(() => {
            const ownedCard = collection.find((c) => c.id === popupCard.id);
            const inDeck = cardCounts.get(popupCard.id) ?? 0;
            return ownedCard ? (
              <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-heading)', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#c8a830', padding: '8px 0', borderTop: '1px solid rgba(0,220,168,0.08)' }}>
                <span>{t('inventory.owned')}: {ownedCard.owned}</span>
                {inDeck > 0 && <span>{t('inventory.inDeck')}: {inDeck}</span>}
              </div>
            ) : null;
          })()}
          {/* Action buttons */}
          {(() => {
            const isForbidden = popupCard.banStatus === 'Forbidden';
            const noAvail = getAvailable(popupCard.id) <= 0;
            const isFusion = popupCard.frameType === 'fusion';
            const deckFull = isFusion ? extraDeck.length >= 15 : mainDeck.length >= 60;
            const addDisabled = !activeDeckId || isForbidden || noAvail || deckFull;
            const inDeck = cardCounts.get(popupCard.id) ?? 0;
            const removeDisabled = inDeck <= 0;
            const addHint = !activeDeckId ? t('deckbuilder.noDeckSelected')
              : isForbidden ? t('banStatus.Forbidden')
              : noAvail ? t('deckbuilder.copyLimitReached')
              : deckFull ? (isFusion ? t('deckbuilder.extraDeckFull') : t('deckbuilder.mainDeckFull'))
              : '';
            return (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', paddingTop: '8px', borderTop: '1px solid rgba(0,220,168,0.08)' }}>
                <button
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 20px', border: '1px solid rgba(0,220,168,0.15)', background: 'rgba(0,200,160,0.05)', color: '#00dca8', cursor: addDisabled ? 'not-allowed' : 'pointer', opacity: addDisabled ? 0.4 : 1 }}
                  onClick={() => { addCard(popupCard); }}
                  disabled={addDisabled}
                  title={addHint}
                >
                  {t('deckbuilder.addToDeck')}
                </button>
                <button
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 20px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: removeDisabled ? 'not-allowed' : 'pointer', opacity: removeDisabled ? 0.4 : 1 }}
                  onClick={() => {
                    if (removeDisabled) return;
                    // Find last occurrence in main or extra deck
                    const mainIdx = mainDeck.lastIndexOf(popupCard.id);
                    const extraIdx = extraDeck.lastIndexOf(popupCard.id);
                    if (mainIdx >= 0) { removeFromMain(mainIdx); }
                    else if (extraIdx >= 0) { removeFromExtra(extraIdx); }
                  }}
                  disabled={removeDisabled}
                >
                  {t('deckbuilder.removeFromDeck')}
                </button>
              </div>
            );
          })()}
        </CardDetailPopup>
      )}

      {/* Drag ghost — card follows cursor */}
      {dragCardId !== null && dragPos && (
        <div
          className={styles.dragGhost}
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <img src={getCardImageUrl(dragCardId)} alt="" draggable={false} />
        </div>
      )}

      {/* Confirm Modal (delete deck / clear deck) */}
      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'delete' ? t('deckbuilder.deleteDeckTitle') : t('deckbuilder.clearDeckTitle')}
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {confirmAction?.type === 'delete'
              ? t('deckbuilder.deleteDeckWarning', { name: confirmAction.deckName ?? '' })
              : t('deckbuilder.clearDeckWarning')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 24px', border: '1px solid var(--orichalcos-faint)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setConfirmAction(null)}
            >
              {t('admin.cancel')}
            </button>
            <button
              style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 24px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer' }}
              onClick={handleConfirm}
            >
              {confirmAction?.type === 'delete' ? t('deckbuilder.deleteDeckConfirm') : t('deckbuilder.clearDeckConfirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
