import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { useCards } from '../store/CardContext';
import { useInventory } from '../store/InventoryContext';
import { useCardLocale } from '../hooks/useCardLocale';
import { getCardImageUrl } from '../services/cardApi';
import { fetchDecks, fetchDeck, createDeck, deleteDeck, saveDeckCards, type DeckSummary } from '../services/deckApi';
import type { Card, OwnedCard } from '../types/card';
import { CardDetailPopup } from '../components/common/CardDetailPopup';
import styles from './DeckbuilderPage.module.css';

type PopupMode = 'add' | 'remove-main' | 'remove-extra';

export function DeckbuilderPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cards } = useCards();
  const { collection, loading: inventoryLoading, refresh: refreshInventory } = useInventory();
  const { localize } = useCardLocale();

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);
  const [mainDeck, setMainDeck] = useState<number[]>([]);
  const [extraDeck, setExtraDeck] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');

  // Track whether cards were changed by user (not by loadDeckCards)
  const [userEdited, setUserEdited] = useState(false);

  // Auto-save to backend on every edit
  useEffect(() => {
    if (activeDeckId && userEdited) {
      saveDeckCards(activeDeckId, mainDeck, extraDeck).catch(() => {});
      setUserEdited(false);
    }
  }, [activeDeckId, mainDeck, extraDeck, userEdited]);

  // Popup state
  const [popupCard, setPopupCard] = useState<Card | null>(null);
  const [popupMode, setPopupMode] = useState<PopupMode>('add');
  const [popupIndex, setPopupIndex] = useState(0);

  // Drag state
  const [dragCardId, setDragCardId] = useState<number | null>(null);
  const [dragFromDeck, setDragFromDeck] = useState<{ type: 'main' | 'extra'; index: number } | null>(null);
  const [dragIsFusion, setDragIsFusion] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // Refresh inventory when deck changes (excludes current deck from usage calc)
  useEffect(() => {
    if (!user) return;
    refreshInventory(activeDeckId ?? undefined);
  }, [user, activeDeckId, refreshInventory]);

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
    return result;
  }, [collection, search, typeFilter]);


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
      setMainDeck(main);
      setExtraDeck(extra);
    } catch {
      setMainDeck([]);
      setExtraDeck([]);
    }
  }

  // Calculate how many copies can still be added to THIS deck
  const getAvailable = useCallback((cardId: number) => {
    const ownedCard = collection.find((c) => c.id === cardId);
    if (!ownedCard) return 0;
    const inThisDeck = cardCounts.get(cardId) ?? 0;
    return Math.max(0, Math.min(3, ownedCard.owned) - inThisDeck);
  }, [collection, cardCounts]);

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
    setMainDeck([]);
    setExtraDeck([]);
    setUserEdited(true);
  }

  function openPoolPopup(card: Card) {
    setPopupCard(card);
    setPopupMode('add');
  }

  function openDeckPopup(card: Card, mode: 'remove-main' | 'remove-extra', index: number) {
    setPopupCard(card);
    setPopupMode(mode);
    setPopupIndex(index);
  }

  function handlePopupAction() {
    if (!popupCard) return;
    if (popupMode === 'add') {
      addCard(popupCard);
    } else if (popupMode === 'remove-main') {
      removeFromMain(popupIndex);
    } else if (popupMode === 'remove-extra') {
      removeFromExtra(popupIndex);
    }
    setPopupCard(null);
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

  async function handleDeleteDeck(id: number) {
    try {
      await deleteDeck(id);
      setDecks(decks.filter((d) => d.id !== id));
      if (activeDeckId === id) {
        setActiveDeckId(null);
        setMainDeck([]);
        setExtraDeck([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
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
        <div
          className={styles.deckPanel}
        >
          <div className={styles.deckHeader}>
            <h2 className={styles.deckTitle}>{t('nav.deckbuilder')}</h2>
            <div className={styles.deckActions}>
              <button className={styles.newBtn} onClick={handleNewDeck}>{t('deckbuilder.newDeck')}</button>
            </div>
          </div>

          <div className={styles.deckList}>
            {decks.map((d) => (
              <div
                key={d.id}
                className={`${styles.deckItem} ${activeDeckId === d.id ? styles.deckItemActive : ''}`}
                onClick={() => { setActiveDeckId(d.id); loadDeckCards(d.id); }}
              >
                <span className={styles.deckItemName}>{d.name}</span>
                <button className={styles.deckItemDelete} onClick={(e) => { e.stopPropagation(); handleDeleteDeck(d.id); }}>x</button>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {activeDeckId && (
            <>
              <div className={styles.deckSection}>
                <div className={styles.deckSectionHeader}>
                  <span>{t('deckbuilder.mainDeck')} ({mainDeck.length}/40-60)</span>
                  <button className={styles.clearBtn} onClick={clearDeck}>{t('deckbuilder.clear')}</button>
                </div>
                {mainDeck.length > 0 && (
                  <div className={styles.deckTypeStats}>
                    <span className={styles.statMonster}>{t('deckbuilder.monsters')}: {deckTypeCounts.monsters}</span>
                    <span className={styles.statSpell}>{t('deckbuilder.spells')}: {deckTypeCounts.spells}</span>
                    <span className={styles.statTrap}>{t('deckbuilder.traps')}: {deckTypeCounts.traps}</span>
                  </div>
                )}
                <div className={`${styles.deckGrid} ${dragCardId && !dragFromDeck && !dragIsFusion ? styles.deckGridDropTarget : ''}`} data-drop="deck">
                  {mainDeck.map((cardId, i) => {
                    const card = getCardById(cardId);
                    return (
                      <div
                        key={`m-${i}`}
                        className={styles.deckCard}
                        onClick={() => card && openDeckPopup(card, 'remove-main', i)}
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(cardId, e, { type: 'main', index: i }); }}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId)} alt="" draggable={false} />
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
                        onClick={() => card && openDeckPopup(card, 'remove-extra', i)}
                        onMouseDown={(e) => { e.stopPropagation(); startDrag(cardId, e, { type: 'extra', index: i }); }}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId)} alt="" draggable={false} />
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

            </>
          )}
        </div>

        {/* Right: Card pool */}
        <div className={`${styles.poolPanel} ${dragFromDeck ? styles.poolPanelDropTarget : ''}`} data-drop="pool">
          <div className={styles.poolHeader}>
            <input
              className={styles.poolSearch}
              placeholder={t('cards.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.poolFilter} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">{t('deckbuilder.filterAll')}</option>
              <option value="normal">{t('deckbuilder.filterNormal')}</option>
              <option value="effect">{t('deckbuilder.filterEffect')}</option>
              <option value="ritual">{t('deckbuilder.filterRitual')}</option>
              <option value="fusion">{t('deckbuilder.filterFusion')}</option>
              <option value="spell">{t('deckbuilder.filterSpell')}</option>
              <option value="trap">{t('deckbuilder.filterTrap')}</option>
            </select>
            <span className={styles.poolCount}>{filteredPool.length}</span>
          </div>
          <div className={styles.poolGrid}>
            {inventoryLoading && <div className={styles.poolLoading}>{t('common.loading')}</div>}
            {!inventoryLoading && collection.length === 0 && (
              <div className={styles.poolEmpty}>
                <p>{t('inventory.noCardsOwned')}</p>
                <a href="/app/shop" className={styles.poolEmptyLink}>{t('inventory.goToShop')}</a>
              </div>
            )}
            {filteredPool.map((card) => {
              const avail = getAvailable(card.id);
              const maxed = avail <= 0;
              const loc = localize(card);
              return (
                <div
                  key={card.id}
                  className={`${styles.poolCard} ${maxed ? styles.poolCardMaxed : ''}`}
                  onClick={() => openPoolPopup(card)}
                  onMouseDown={(e) => { if (!maxed) startDrag(card.id, e); }}
                  title={loc.name}
                >
                  <img src={getCardImageUrl(card.id)} alt={loc.name} loading="lazy" draggable={false} />
                </div>
              );
            })}
          </div>
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
          }}
          onClose={() => setPopupCard(null)}
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
          <div>
            {popupMode === 'add' ? (() => {
              const noAvail = getAvailable(popupCard.id) <= 0;
              const isFusion = popupCard.frameType === 'fusion';
              const deckFull = isFusion ? extraDeck.length >= 15 : mainDeck.length >= 60;
              const disabled = !activeDeckId || noAvail || deckFull;
              const hint = !activeDeckId ? t('deckbuilder.noDeckSelected')
                : noAvail ? t('deckbuilder.copyLimitReached')
                : deckFull ? (isFusion ? t('deckbuilder.extraDeckFull') : t('deckbuilder.mainDeckFull'))
                : '';
              return (
                <button
                  style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 24px', border: '1px solid rgba(0,220,168,0.15)', background: 'rgba(0,200,160,0.05)', color: '#00dca8', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
                  onClick={handlePopupAction}
                  disabled={disabled}
                  title={hint}
                >
                  {t('deckbuilder.addToDeck')}
                </button>
              );
            })() : (
              <button
                style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '10px 24px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer' }}
                onClick={handlePopupAction}
              >
                {t('deckbuilder.removeFromDeck')}
              </button>
            )}
          </div>
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
    </div>
  );
}
