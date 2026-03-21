/**
 * useDeckbuilder — encapsulates all deck state management and CRUD operations.
 * Extracted from DeckbuilderPage to keep the page component lean.
 *
 * Deck contents are stored as DeckCopy[] — each array entry is one copy of a card
 * with its own per-copy artwork choice. This enables e.g. 3x Blue-Eyes with 3 different artworks.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { useCards } from '../store/CardContext';
import { useInventory } from '../store/InventoryContext';
import { useSession } from '../store/SessionContext';
import { fetchDecks, fetchDeck, createDeck, deleteDeck, saveDeckCards, type DeckSummary, type DeckCopy } from '../services/deckApi';
import type { Card, OwnedCard } from '../types/card';

export type { DeckCopy } from '../services/deckApi';
export type ConfirmAction = { type: 'delete' | 'clear'; deckId?: number; deckName?: string } | null;

export function useDeckbuilder() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cards } = useCards();
  const { collection, loading: inventoryLoading, refresh: refreshInventory, setPreferredArtwork } = useInventory();

  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);
  const [mainDeck, setMainDeck] = useState<DeckCopy[]>([]);
  const [extraDeck, setExtraDeck] = useState<DeckCopy[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const deckCache = useRef<Map<number, { main: DeckCopy[]; extra: DeckCopy[] }>>(new Map());
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckError, setNewDeckError] = useState('');
  const [userEdited, setUserEdited] = useState(false);

  // User-preferred artworks derived from collection
  const userPrefs = useMemo(() => {
    const m = new Map<number, number>();
    for (const card of collection) {
      if (card.preferredArtworkId) m.set(card.id, card.preferredArtworkId);
    }
    return m;
  }, [collection]);

  // User-preferred effects derived from inventory
  const { inventory } = useSession();
  const effectPrefs = useMemo(() => {
    const m = new Map<number, string | null>();
    for (const [cardId, entry] of inventory) {
      if (entry.preferredEffect) m.set(cardId, entry.preferredEffect);
    }
    return m;
  }, [inventory]);

  /** Resolve the effective artworkId for a specific copy (per-copy → userPref → null). */
  const resolveArtwork = useCallback((copy: DeckCopy): number | null => {
    return copy.artworkId ?? userPrefs.get(copy.cardId) ?? null;
  }, [userPrefs]);

  // Auto-save to backend on every edit + update cache
  useEffect(() => {
    if (!activeDeckId || !userEdited) return;

    deckCache.current.set(activeDeckId, { main: mainDeck, extra: extraDeck });
    saveDeckCards(activeDeckId, mainDeck, extraDeck).catch(() => {});
    setUserEdited(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeckId, mainDeck, extraDeck, userEdited]);

  // Load inventory once on mount
  useEffect(() => {
    if (!user) return;
    refreshInventory(activeDeckId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load deck list
  useEffect(() => {
    if (!user) return;
    fetchDecks().then(setDecks).catch(() => {});
  }, [user]);

  const cardCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const copy of [...mainDeck, ...extraDeck]) {
      counts.set(copy.cardId, (counts.get(copy.cardId) ?? 0) + 1);
    }
    return counts;
  }, [mainDeck, extraDeck]);

  const deckTypeCounts = useMemo(() => {
    let normal = 0, effect = 0, ritual = 0, spells = 0, traps = 0;
    for (const copy of mainDeck) {
      const card = collection.find((c) => c.id === copy.cardId) ?? cards.find((c) => c.id === copy.cardId);
      if (!card) continue;
      if (card.frameType === 'spell') spells++;
      else if (card.frameType === 'trap') traps++;
      else if (card.frameType === 'ritual') ritual++;
      else if (card.frameType === 'effect') effect++;
      else normal++;
    }
    return { normal, effect, ritual, spells, traps, monsters: normal + effect + ritual };
  }, [mainDeck, collection, cards]);

  async function loadDeckCards(deckId: number) {
    const cached = deckCache.current.get(deckId);
    if (cached) {
      setMainDeck(cached.main);
      setExtraDeck(cached.extra);
      return;
    }
    setDeckLoading(true);
    try {
      const detail = await fetchDeck(deckId);
      const main: DeckCopy[] = [];
      const extra: DeckCopy[] = [];
      for (const c of detail.cards) {
        const copy: DeckCopy = { cardId: c.card_id, artworkId: c.artwork_id };
        if (c.frame_type === 'fusion') extra.push(copy);
        else main.push(copy);
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

  const getMaxCopies = useCallback((card: Card | OwnedCard) => {
    switch (card.banStatus) {
      case 'Forbidden': return 0;
      case 'Limited': return 1;
      case 'Semi-Limited': return 2;
      default: return 3;
    }
  }, []);

  const getAvailable = useCallback((cardId: number) => {
    const ownedCard = collection.find((c) => c.id === cardId);
    if (!ownedCard) return 0;
    const maxCopies = getMaxCopies(ownedCard);
    const inThisDeck = cardCounts.get(cardId) ?? 0;
    return Math.max(0, Math.min(maxCopies, ownedCard.owned) - inThisDeck);
  }, [collection, cardCounts, getMaxCopies]);

  /** Add a card to the deck. Bakes in the artwork at add-time so it won't change when user prefs change later. */
  const addCard = useCallback((card: Card, artworkId?: number | null) => {
    if (getAvailable(card.id) <= 0) return;
    const resolvedArt = artworkId ?? userPrefs.get(card.id) ?? null;
    const copy: DeckCopy = { cardId: card.id, artworkId: resolvedArt };
    if (card.frameType === 'fusion') {
      if (extraDeck.length >= 15) return;
      setExtraDeck((prev) => [...prev, copy]);
    } else {
      if (mainDeck.length >= 60) return;
      setMainDeck((prev) => [...prev, copy]);
    }
    setUserEdited(true);
  }, [getAvailable, mainDeck.length, extraDeck.length, userPrefs]);

  function removeFromMain(index: number) {
    setMainDeck(mainDeck.filter((_, i) => i !== index));
    setUserEdited(true);
  }

  function removeFromExtra(index: number) {
    setExtraDeck(extraDeck.filter((_, i) => i !== index));
    setUserEdited(true);
  }

  /** Set artwork for a specific copy in the deck. */
  const setArtworkForCopy = useCallback((deckType: 'main' | 'extra', index: number, artworkId: number) => {
    const setter = deckType === 'main' ? setMainDeck : setExtraDeck;
    setter((prev) => prev.map((copy, i) =>
      i === index ? { ...copy, artworkId } : copy
    ));
    setUserEdited(true);
  }, []);

  function clearDeck() {
    setConfirmAction({ type: 'clear' });
  }

  function doClearDeck() {
    setMainDeck([]);
    setExtraDeck([]);
    setUserEdited(true);
    setConfirmAction(null);
  }

  // Deck name validation
  const DECK_NAME_REGEX = /^[A-Za-z0-9\u00C0-\u024F_-]{1,32}$/;

  function validateDeckName(name: string): string {
    if (!name) return t('deckbuilder.deckNameEmpty');
    if (name.length > 32) return t('deckbuilder.deckNameTooLong');
    if (/\s/.test(name)) return t('deckbuilder.deckNameNoSpaces');
    if (!DECK_NAME_REGEX.test(name)) return t('deckbuilder.deckNameInvalidChars');
    if (decks.some((d) => d.name.toLowerCase() === name.toLowerCase())) return t('deckbuilder.deckNameDuplicate');
    return '';
  }

  function handleNewDeck() {
    if (!user) return;
    setNewDeckName('');
    setNewDeckError('');
    setNewDeckOpen(true);
  }

  function handleDeckNameChange(value: string) {
    setNewDeckName(value);
    setNewDeckError(value.trim() ? validateDeckName(value.trim()) : '');
  }

  async function doCreateDeck() {
    const name = newDeckName.trim();
    const validationError = validateDeckName(name);
    if (validationError) { setNewDeckError(validationError); return; }
    setNewDeckOpen(false);
    setNewDeckError('');
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
    if (confirmAction.type === 'clear') doClearDeck();
    else if (confirmAction.type === 'delete' && confirmAction.deckId) doDeleteDeck(confirmAction.deckId);
  }

  function getCardById(id: number): Card | undefined {
    return cards.find((c) => c.id === id);
  }

  function selectDeck(deckId: number) {
    if (activeDeckId === deckId) {
      setActiveDeckId(null);
      setMainDeck([]);
      setExtraDeck([]);
    } else {
      setActiveDeckId(deckId);
      loadDeckCards(deckId);
    }
  }

  return {
    // State
    decks, activeDeckId, mainDeck, extraDeck,
    userPrefs, effectPrefs,
    deckLoading, error, confirmAction, setConfirmAction,
    newDeckOpen, setNewDeckOpen, newDeckName, newDeckError,
    cardCounts, deckTypeCounts, collection, inventoryLoading,
    setPreferredArtwork,
    // Actions
    selectDeck, addCard, removeFromMain, removeFromExtra, clearDeck,
    handleNewDeck, handleDeckNameChange, doCreateDeck,
    handleDeleteDeck, handleConfirm, getAvailable, getCardById,
    setArtworkForCopy, resolveArtwork,
  };
}
