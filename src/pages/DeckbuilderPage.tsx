import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { useCards } from '../store/CardContext';
import { useCardLocale } from '../hooks/useCardLocale';
import { getCardImageUrl } from '../services/cardApi';
import { fetchDecks, fetchDeck, createDeck, deleteDeck, saveDeckCards, type DeckSummary } from '../services/deckApi';
import type { Card } from '../types/card';
import styles from './DeckbuilderPage.module.css';

type PopupMode = 'add' | 'remove-main' | 'remove-extra';

export function DeckbuilderPage() {
  const { user } = useAuth();
  const { cards } = useCards();
  const { localize } = useCardLocale();

  // Restore state from localStorage on mount
  const savedState = useMemo(() => {
    try {
      const s = localStorage.getItem('dmc-deckbuilder');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, []);

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(savedState?.activeDeckId ?? null);
  const [mainDeck, setMainDeck] = useState<number[]>(savedState?.mainDeck ?? []);
  const [extraDeck, setExtraDeck] = useState<number[]>(savedState?.extraDeck ?? []);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');

  // Track whether cards were changed by user (not by loadDeckCards)
  const [userEdited, setUserEdited] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('dmc-deckbuilder', JSON.stringify({
      activeDeckId,
      mainDeck,
      extraDeck
    }));
  }, [activeDeckId, mainDeck, extraDeck]);

  // Auto-save to backend only when user edits
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

  const availableCards = useMemo(() => cards.filter((c) => c.available), [cards]);

  const filteredPool = useMemo(() => {
    let result = availableCards;
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
  }, [availableCards, search, typeFilter]);


  const cardCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const id of [...mainDeck, ...extraDeck]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [mainDeck, extraDeck]);

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

  const addCard = useCallback((card: Card) => {
    const count = cardCounts.get(card.id) ?? 0;
    if (count >= 3) return;
    if (card.frameType === 'fusion') {
      if (extraDeck.length >= 15) return;
      setExtraDeck((prev) => [...prev, card.id]);
    } else {
      if (mainDeck.length >= 40) return;
      setMainDeck((prev) => [...prev, card.id]);
    }
    setUserEdited(true);
  }, [cardCounts, mainDeck.length, extraDeck.length]);

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

  // Drag & Drop handlers
  function handleDragStartFromPool(cardId: number) {
    const card = cards.find((c) => c.id === cardId);
    setDragCardId(cardId);
    setDragFromDeck(null);
    setDragIsFusion(card?.frameType === 'fusion');
  }

  function handleDragStartFromDeck(cardId: number, type: 'main' | 'extra', index: number) {
    setDragCardId(cardId);
    setDragFromDeck({ type, index });
    setDragIsFusion(false);
  }

  function handleDropOnDeck(e: React.DragEvent) {
    e.preventDefault();
    if (dragCardId === null) return;
    if (!dragFromDeck) {
      const card = cards.find((c) => c.id === dragCardId);
      if (card) addCard(card);
    }
    setDragCardId(null);
    setDragFromDeck(null);
  }

  function handleDropOnPool(e: React.DragEvent) {
    e.preventDefault();
    if (dragFromDeck) {
      if (dragFromDeck.type === 'main') {
        removeFromMain(dragFromDeck.index);
      } else {
        removeFromExtra(dragFromDeck.index);
      }
    }
    setDragCardId(null);
    setDragFromDeck(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function loadPreset(setName: string) {
    if (!activeDeckId) {
      setError('Bitte zuerst ein Deck erstellen oder auswaehlen');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/cards/sets/${encodeURIComponent(setName)}`);
      if (!res.ok) throw new Error('Set nicht gefunden');
      const setCards: { id: number; frame_type: string }[] = await res.json();

      const main: number[] = [];
      const extra: number[] = [];

      for (const c of setCards) {
        if (c.frame_type === 'fusion') {
          if (extra.length < 15) extra.push(c.id);
        } else {
          if (main.length < 40) main.push(c.id);
        }
      }

      setMainDeck(main);
      setExtraDeck(extra);
      setUserEdited(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorlage konnte nicht geladen werden');
    }
  }

  async function handleNewDeck() {
    if (!user) return;
    const name = prompt('Deck-Name:');
    if (!name) return;
    try {
      const deck = await createDeck(name);
      setDecks([...decks, { ...deck, card_count: '0', created_at: '', updated_at: '' }]);
      setActiveDeckId(deck.id);
      setMainDeck([]);
      setExtraDeck([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
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
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  function getCardById(id: number): Card | undefined {
    return cards.find((c) => c.id === id);
  }

  if (!user) {
    return <div className={styles.page}><p className={styles.loginHint}>Bitte anmelden um Decks zu erstellen.</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left: Deck */}
        <div
          className={styles.deckPanel}
          onDrop={handleDropOnDeck}
          onDragOver={handleDragOver}
        >
          <div className={styles.deckHeader}>
            <h2 className={styles.deckTitle}>Deck erstellen</h2>
            <div className={styles.deckActions}>
              <button className={styles.newBtn} onClick={handleNewDeck}>Neues Deck</button>
              {activeDeckId && (
                <select
                  className={styles.presetSelect}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) loadPreset(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Vorlage laden...</option>
                  <option value="Starter Deck: Yugi">Starter Deck: Yugi</option>
                  <option value="Starter Deck: Kaiba">Starter Deck: Kaiba</option>
                </select>
              )}
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
                  <span>Hauptdeck ({mainDeck.length}/40)</span>
                  <button className={styles.clearBtn} onClick={clearDeck}>Leeren</button>
                </div>
                <div className={`${styles.deckGrid} ${dragCardId && !dragFromDeck && !dragIsFusion ? styles.deckGridDropTarget : ''}`}>
                  {mainDeck.map((cardId, i) => {
                    const card = getCardById(cardId);
                    return (
                      <div
                        key={`m-${i}`}
                        className={styles.deckCard}
                        onClick={() => card && openDeckPopup(card, 'remove-main', i)}
                        draggable
                        onDragStart={() => handleDragStartFromDeck(cardId, 'main', i)}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId)} alt="" draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.deckSection}>
                <span>Extra Deck ({extraDeck.length}/15)</span>
                <div className={`${styles.deckGrid} ${dragCardId && !dragFromDeck && dragIsFusion ? styles.deckGridDropTarget : ''}`}>
                  {extraDeck.map((cardId, i) => {
                    const card = getCardById(cardId);
                    return (
                      <div
                        key={`e-${i}`}
                        className={styles.deckCard}
                        onClick={() => card && openDeckPopup(card, 'remove-extra', i)}
                        draggable
                        onDragStart={() => handleDragStartFromDeck(cardId, 'extra', i)}
                        title={card ? localize(card).name : ''}
                      >
                        <img src={getCardImageUrl(cardId)} alt="" draggable={false} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${styles.deckStatus} ${mainDeck.length === 40 ? styles.deckStatusReady : ''}`}>
                {mainDeck.length === 40
                  ? 'Spielbereit'
                  : `${mainDeck.length}/40 Karten`}
              </div>
            </>
          )}
        </div>

        {/* Right: Card pool */}
        <div className={styles.poolPanel} onDrop={handleDropOnPool} onDragOver={handleDragOver}>
          <div className={styles.poolHeader}>
            <input
              className={styles.poolSearch}
              placeholder="Karte suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.poolFilter} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Alle</option>
              <option value="normal">Normal</option>
              <option value="effect">Effekt</option>
              <option value="ritual">Ritual</option>
              <option value="fusion">Fusion</option>
              <option value="spell">Zauber</option>
              <option value="trap">Fallen</option>
            </select>
            <span className={styles.poolCount}>{filteredPool.length}</span>
          </div>
          <div className={styles.poolGrid}>
            {filteredPool.map((card) => {
              const count = cardCounts.get(card.id) ?? 0;
              const maxed = count >= 3;
              const loc = localize(card);
              return (
                <div
                  key={card.id}
                  className={`${styles.poolCard} ${maxed ? styles.poolCardMaxed : ''}`}
                  onClick={() => openPoolPopup(card)}
                  draggable={!maxed}
                  onDragStart={() => handleDragStartFromPool(card.id)}
                  title={loc.name}
                >
                  <img src={getCardImageUrl(card.id)} alt={loc.name} loading="lazy" draggable={false} />
                  {count > 0 && <span className={styles.poolCardCount}>{count}/3</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card popup */}
      {popupCard && (
        <div className={styles.popupOverlay} onClick={() => setPopupCard(null)}>
          <div className={styles.popupModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.popupClose} onClick={() => setPopupCard(null)}>x</button>
            <div className={styles.popupContent}>
              <div className={styles.popupImage}>
                <img src={getCardImageUrl(popupCard.id, 'full')} alt={localize(popupCard).name} />
              </div>
              <div className={styles.popupInfo}>
                <h3 className={styles.popupName}>{localize(popupCard).name}</h3>
                {popupCard.name_en && popupCard.name_en !== popupCard.name && (
                  <span className={styles.popupNameEn}>{localize(popupCard).secondaryName}</span>
                )}
                <div className={styles.popupType}>{localize(popupCard).type}</div>
                {popupCard.atk !== undefined && (
                  <div className={styles.popupStats}>
                    <span className={styles.popupAtk}>ATK/{popupCard.atk}</span>
                    <span className={styles.popupDef}>DEF/{popupCard.def ?? '?'}</span>
                  </div>
                )}
                <p className={styles.popupDesc}>{localize(popupCard).desc}</p>
                <div className={styles.popupActions}>
                  {popupMode === 'add' ? (
                    <button
                      className={styles.popupAddBtn}
                      onClick={handlePopupAction}
                      disabled={(cardCounts.get(popupCard.id) ?? 0) >= 3}
                    >
                      {(cardCounts.get(popupCard.id) ?? 0) >= 3
                        ? 'Max. 3 Kopien'
                        : popupCard.frameType === 'fusion'
                          ? extraDeck.length >= 15 ? 'Extra Deck voll' : 'Zum Extra Deck'
                          : mainDeck.length >= 40 ? 'Hauptdeck voll' : 'Zum Hauptdeck'}
                    </button>
                  ) : (
                    <button className={styles.popupRemoveBtn} onClick={handlePopupAction}>
                      Aus Deck entfernen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
