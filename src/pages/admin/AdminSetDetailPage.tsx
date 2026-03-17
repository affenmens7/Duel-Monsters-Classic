/**
 * AdminSetDetailPage — manage which cards belong to a specific set.
 * Shows set info, lists assigned cards with inline rarity editing,
 * and provides a search panel to add new cards.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { getCardImageUrl } from '../../services/cardApi';
import { env } from '../../config/env';
import {
  fetchSetInfo,
  fetchSetCards,
  fetchAdminCards,
  assignCardToSet,
  removeCardFromSet,
  type AdminSetRow,
  type SetCardRow,
  type AdminCardRow,
} from '../../services/adminApi';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import styles from './AdminSetDetail.module.css';

const RARITIES = ['Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'];

const RARITY_CODE_MAP: Record<string, string> = {
  Common: 'C',
  Rare: 'R',
  'Super Rare': 'SR',
  'Ultra Rare': 'UR',
  'Secret Rare': 'ScR',
};

const RARITY_ORDER: Record<string, number> = {
  'Secret Rare': 0,
  'Ultra Rare': 1,
  'Super Rare': 2,
  'Rare': 3,
  'Short Print': 4,
  'Common': 5,
};

function rarityBadgeClass(rarity: string): string {
  const lower = rarity.toLowerCase();
  if (lower.includes('secret')) return styles.raritySecretRare;
  if (lower.includes('ultra')) return styles.rarityUltraRare;
  if (lower.includes('super')) return styles.raritySuperRare;
  if (lower.includes('rare')) return styles.rarityRare;
  if (lower.includes('short')) return styles.rarityShortPrint;
  return styles.rarityCommon;
}

const SET_CARDS_LIMIT = 200;

// ============================================================
// SetInfoBar — top section with set metadata
// ============================================================

function SetInfoBar({ set, t }: { set: AdminSetRow; t: (key: string) => string }) {
  return (
    <div className={styles.setHeader}>
      <h1 className={styles.setName}>{set.name}</h1>
      <span className={styles.badgeCode + ' ' + styles.badge}>{set.code}</span>
      <span className={styles.badgeType + ' ' + styles.badge}>{set.product_type}</span>
      <span className={styles.badgeWave + ' ' + styles.badge}>Wave {set.wave}</span>
      <span
        className={
          styles.badge + ' ' + (set.active ? styles.badgeActive : styles.badgeInactive)
        }
      >
        {set.active ? t('admin.active') : t('admin.inactive')}
      </span>
      <span className={styles.badgeCount + ' ' + styles.badge}>
        {set.card_count} {t('admin.cards')}
      </span>
    </div>
  );
}

// ============================================================
// SetCardsTable — cards currently in the set
// ============================================================

interface SetCardsTableProps {
  readonly cards: SetCardRow[];
  readonly total: number;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onRarityChange: (card: SetCardRow, rarity: string) => void;
  readonly onRemove: (card: SetCardRow) => void;
  readonly onCardClick: (cardId: number) => void;
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly t: (key: string) => string;
}

function SetCardsTable({
  cards,
  total,
  page,
  onPageChange,
  onRarityChange,
  onRemove,
  onCardClick,
  search,
  onSearchChange,
  t,
}: SetCardsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / SET_CARDS_LIMIT));

  type SortKey = 'name_de' | 'name_en' | 'frame_type' | 'rarity';
  type SortDir = 'asc' | 'desc';

  const [sortBy, setSortBy] = useState<SortKey>('rarity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sortedCards = useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'rarity') {
        const ra = RARITY_ORDER[a.rarity] ?? 99;
        const rb = RARITY_ORDER[b.rarity] ?? 99;
        cmp = ra - rb;
      } else if (sortBy === 'name_de' || sortBy === 'name_en' || sortBy === 'frame_type') {
        const va = (a[sortBy] ?? '').toLowerCase();
        const vb = (b[sortBy] ?? '').toLowerCase();
        cmp = va.localeCompare(vb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [cards, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortArrow = (key: SortKey) =>
    sortBy === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  return (
    <>
      <input
        className={styles.searchInput}
        type="text"
        placeholder={t('admin.searchInSet')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {cards.length === 0 ? (
        <p className={styles.empty}>{t('admin.noCardsInSet')}</p>
      ) : (
        <>
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th className={styles.cardTh}>{t('admin.image')}</th>
                <th
                  className={`${styles.cardTh} ${styles.cardThSortable}`}
                  onClick={() => handleSort('name_de')}
                >
                  {t('admin.nameDe')}{sortArrow('name_de')}
                </th>
                <th
                  className={`${styles.cardTh} ${styles.cardThSortable}`}
                  onClick={() => handleSort('name_en')}
                >
                  {t('admin.nameEn')}{sortArrow('name_en')}
                </th>
                <th
                  className={`${styles.cardTh} ${styles.cardThSortable}`}
                  onClick={() => handleSort('frame_type')}
                >
                  {t('admin.type')}{sortArrow('frame_type')}
                </th>
                <th
                  className={`${styles.cardTh} ${styles.cardThSortable}`}
                  onClick={() => handleSort('rarity')}
                >
                  {t('admin.rarity')}{sortArrow('rarity')}
                </th>
                <th className={styles.cardTh}>{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((card) => (
                <tr key={card.id} className={styles.cardRow}>
                  <td className={styles.cardTd} onClick={() => onCardClick(card.id)}>
                    <img
                      className={styles.cardThumb}
                      src={getCardImageUrl(card.id, 'small', card.artwork_id ?? undefined)}
                      alt=""
                      loading="lazy"
                    />
                  </td>
                  <td className={styles.cardTd} onClick={() => onCardClick(card.id)}>{card.name_de}</td>
                  <td className={styles.cardTdMuted} onClick={() => onCardClick(card.id)}>{card.name_en}</td>
                  <td className={styles.cardTdCode}>{card.frame_type}</td>
                  <td className={styles.cardTd}>
                    <span className={`${styles.rarityBadge} ${rarityBadgeClass(card.rarity)}`}>
                      {card.rarity}
                    </span>
                  </td>
                  <td className={styles.cardTd}>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => onRemove(card)}
                    >
                      {t('admin.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                {t('admin.prev')}
              </button>
              <span className={styles.pageInfo}>
                {t('admin.page')} {page} {t('admin.of')} {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                {t('admin.next')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ============================================================
// AddCardsPanel — search all cards and add them to the set
// ============================================================

interface AddCardsPanelProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly results: AdminCardRow[];
  readonly apiResults: any[];
  readonly loading: boolean;
  readonly setCardIds: ReadonlySet<number>;
  readonly onAdd: (card: AdminCardRow, rarity: string) => void;
  readonly onAddApi: (apiCard: any, rarity: string) => void;
  readonly importingCard: number | null;
  readonly t: (key: string) => string;
}

function AddCardsPanel({
  search,
  onSearchChange,
  results,
  apiResults,
  loading,
  setCardIds,
  onAdd,
  onAddApi,
  importingCard,
  t,
}: AddCardsPanelProps) {
  const [selectedRarities, setSelectedRarities] = useState<Record<number, string>>({});

  const getRarity = (cardId: number): string =>
    selectedRarities[cardId] ?? 'Common';

  const handleRarityChange = (cardId: number, rarity: string) => {
    setSelectedRarities((prev) => ({ ...prev, [cardId]: rarity }));
  };

  return (
    <>
      <input
        className={styles.searchInput}
        type="text"
        placeholder={t('admin.searchCardDeEn')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {loading && <p className={styles.loading}>{t('admin.searching')}</p>}

      {!loading && search.length >= 2 && results.length === 0 && apiResults.length === 0 && (
        <p className={styles.empty}>{t('admin.noSearchResults')}</p>
      )}

      {!loading && results.length > 0 && (
        <table className={styles.cardTable}>
          <thead>
            <tr>
              <th className={styles.cardTh}>{t('admin.image')}</th>
              <th className={styles.cardTh}>{t('admin.nameDe')}</th>
              <th className={styles.cardTh}>{t('admin.nameEn')}</th>
              <th className={styles.cardTh}>{t('admin.type')}</th>
              <th className={styles.cardTh}>{t('admin.rarity')}</th>
              <th className={styles.cardTh}>{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((card) => {
              const alreadyInSet = setCardIds.has(card.id);
              return (
                <tr
                  key={card.id}
                  className={alreadyInSet ? styles.cardAlreadyInSet : undefined}
                >
                  <td className={styles.cardTd}>
                    <img
                      className={styles.cardThumb}
                      src={getCardImageUrl(card.id, 'small')}
                      alt=""
                      loading="lazy"
                    />
                  </td>
                  <td className={styles.cardTd}>{card.name_de}</td>
                  <td className={styles.cardTdMuted}>{card.name_en}</td>
                  <td className={styles.cardTdCode}>{card.frame_type}</td>
                  <td className={styles.cardTd}>
                    {alreadyInSet ? (
                      <span className={styles.inSetMark}>{t('admin.inSet')}</span>
                    ) : (
                      <select
                        className={styles.raritySelect}
                        value={getRarity(card.id)}
                        onChange={(e) => handleRarityChange(card.id, e.target.value)}
                      >
                        {RARITIES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className={styles.cardTd}>
                    {alreadyInSet ? (
                      <span className={styles.inSetMark}>--</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => onAdd(card, getRarity(card.id))}
                      >
                        {t('admin.add')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* API results — cards not yet in our DB */}
      {!loading && apiResults.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: '16px', fontSize: '0.65rem' }}>
            {t('admin.importFromYgopro')} ({apiResults.length})
          </h4>
          <table className={styles.cardTable}>
            <thead>
              <tr>
                <th className={styles.cardTh}>{t('admin.image')}</th>
                <th className={styles.cardTh}>{t('admin.nameDe')}</th>
                <th className={styles.cardTh}>{t('admin.nameEn')}</th>
                <th className={styles.cardTh}>{t('admin.type')}</th>
                <th className={styles.cardTh}>{t('admin.rarity')}</th>
                <th className={styles.cardTh}>{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody>
              {apiResults.map((card) => (
                <tr key={card.id}>
                  <td className={styles.cardTd}>
                    {card.image_url_small && (
                      <img className={styles.cardThumb} src={card.image_url_small} alt="" loading="lazy" />
                    )}
                  </td>
                  <td className={styles.cardTd}>{card.name_de}</td>
                  <td className={styles.cardTdMuted}>{card.name_en}</td>
                  <td className={styles.cardTdCode}>{card.frame_type}</td>
                  <td className={styles.cardTd}>
                    <select
                      className={styles.raritySelect}
                      value={getRarity(card.id)}
                      onChange={(e) => handleRarityChange(card.id, e.target.value)}
                    >
                      {RARITIES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.cardTd}>
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => onAddApi(card, getRarity(card.id))}
                      disabled={importingCard === card.id}
                    >
                      {importingCard === card.id ? '...' : t('admin.importAndAdd')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

// ============================================================
// AdminSetDetailPage
// ============================================================

export function AdminSetDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useTranslation();

  const decodedName = name ? decodeURIComponent(name) : '';

  // Set info
  const [setInfo, setSetInfo] = useState<AdminSetRow | null>(null);

  // Set cards
  const [setCards, setSetCards] = useState<SetCardRow[]>([]);
  const [setCardsTotal, setSetCardsTotal] = useState(0);
  const [setCardsPage, setSetCardsPage] = useState(1);
  const [setCardsSearch, setSetCardsSearch] = useState('');

  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounced set cards search
  const [setCardsDebouncedSearch, setSetCardsDebouncedSearch] = useState('');
  const setCardsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add card search (own DB + YGOPRODeck API)
  const [addSearch, setAddSearch] = useState('');
  const [addDebouncedSearch, setAddDebouncedSearch] = useState('');
  const [addResults, setAddResults] = useState<AdminCardRow[]>([]);
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [importingCard, setImportingCard] = useState<number | null>(null);

  // Card detail popup
  const [popupCardId, setPopupCardId] = useState<number | null>(null);
  const [popupArtworks, setPopupArtworks] = useState<any[]>([]);

  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set of card IDs already in this set (for quick lookup)
  const setCardIds = useMemo(
    () => new Set(setCards.map((c) => c.id)),
    [setCards],
  );

  // ----------------------------------------------------------
  // Load set info
  // ----------------------------------------------------------

  const loadSetInfo = useCallback(async () => {
    if (!token || !decodedName) return;
    try {
      const info = await fetchSetInfo(token, decodedName);
      setSetInfo(info);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.errorLoading');
      // Treat 404 as "set not found"
      if (msg.includes('nicht gefunden') || msg.includes('not found')) {
        setError(t('admin.setNotFound'));
      } else {
        setError(msg);
      }
    }
  }, [token, decodedName, t]);

  // ----------------------------------------------------------
  // Load set cards
  // ----------------------------------------------------------

  const loadSetCards = useCallback(async () => {
    if (!token || !decodedName) return;
    // Only search when debounced value is 2+ chars, or show all when empty
    const searchParam = setCardsDebouncedSearch.length >= 2
      ? setCardsDebouncedSearch
      : setCardsDebouncedSearch.length === 0
        ? undefined
        : '__skip__';
    if (searchParam === '__skip__') return;
    try {
      const result = await fetchSetCards(token, decodedName, {
        page: setCardsPage,
        limit: SET_CARDS_LIMIT,
        search: searchParam,
      });
      setSetCards(result.cards);
      setSetCardsTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errorLoadingCards'));
    }
  }, [token, decodedName, setCardsPage, setCardsDebouncedSearch, t]);

  // ----------------------------------------------------------
  // Initial load
  // ----------------------------------------------------------

  // Initial load — only once
  const initialLoaded = useRef(false);
  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    async function init() {
      setLoading(true);
      await Promise.all([loadSetInfo(), loadSetCards()]);
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload set cards when debounced search or page changes (NOT on initial load)
  useEffect(() => {
    if (!initialLoaded.current) return;
    loadSetCards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCardsDebouncedSearch, setCardsPage]);

  // ----------------------------------------------------------
  // Add-card search (debounced)
  // ----------------------------------------------------------

  const handleAddSearchChange = useCallback((value: string) => {
    setAddSearch(value);
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    addDebounceRef.current = setTimeout(() => {
      setAddDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
      if (setCardsDebounceRef.current) clearTimeout(setCardsDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!token || addDebouncedSearch.length < 2) {
      setAddResults([]);
      setApiResults([]);
      return;
    }

    let cancelled = false;

    async function search() {
      setAddLoading(true);
      try {
        // Search own DB + YGOPRODeck API in parallel
        const [dbResult, apiRes] = await Promise.allSettled([
          fetchAdminCards(token!, { search: addDebouncedSearch, limit: 50 }),
          fetch(`${env.api.baseUrl}/admin/cards/search-api?search=${encodeURIComponent(addDebouncedSearch)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
        ]);

        if (!cancelled) {
          const dbCards = dbResult.status === 'fulfilled' ? dbResult.value.cards : [];
          setAddResults(dbCards);

          // Filter API results: only show cards NOT in our DB
          const dbIds = new Set(dbCards.map((c) => c.id));
          const apiCards = apiRes.status === 'fulfilled' ? (apiRes.value.cards ?? []).filter((c: any) => !c.already_imported && !dbIds.has(c.id)) : [];
          setApiResults(apiCards);
        }
      } catch {
        if (!cancelled) {
          setAddResults([]);
          setApiResults([]);
        }
      } finally {
        if (!cancelled) {
          setAddLoading(false);
        }
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [token, addDebouncedSearch]);

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleSetCardsSearchChange = useCallback((value: string) => {
    setSetCardsSearch(value);
    if (setCardsDebounceRef.current) clearTimeout(setCardsDebounceRef.current);

    // When cleared, immediately show all cards
    if (value.length === 0) {
      setSetCardsDebouncedSearch('');
      setSetCardsPage(1);
      return;
    }

    // Only trigger API search at 2+ chars, debounced
    setCardsDebounceRef.current = setTimeout(() => {
      setSetCardsDebouncedSearch(value);
      setSetCardsPage(1);
    }, 300);
  }, []);

  const handleRarityChange = useCallback(
    async (card: SetCardRow, rarity: string) => {
      if (!token || !decodedName) return;
      const rarityCode = RARITY_CODE_MAP[rarity] ?? 'C';

      // Optimistic update
      setSetCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, rarity, rarityCode } : c,
        ),
      );

      try {
        await assignCardToSet(token, decodedName, {
          cardId: card.id,
          rarity,
          rarityCode,
        });
      } catch {
        // Revert on failure
        setSetCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? { ...c, rarity: card.rarity, rarityCode: card.rarity_code }
              : c,
          ),
        );
      }
    },
    [token, decodedName],
  );

  const handleRemoveCard = useCallback(
    async (card: SetCardRow) => {
      if (!token || !decodedName) return;

      // Optimistic removal
      setSetCards((prev) => prev.filter((c) => c.id !== card.id));
      setSetCardsTotal((prev) => prev - 1);

      try {
        await removeCardFromSet(token, decodedName, card.id);
        // Refresh set info to update card count badge
        await loadSetInfo();
      } catch {
        // Revert on failure — reload the list
        await loadSetCards();
        await loadSetInfo();
      }
    },
    [token, decodedName, loadSetCards, loadSetInfo],
  );

  // Open card popup + load artworks
  const openCardPopup = useCallback(async (cardId: number) => {
    setPopupCardId(cardId);
    setPopupArtworks([]);
    if (!token) return;
    try {
      const res = await fetch(`${env.api.baseUrl}/admin/cards/${cardId}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPopupArtworks(data);
      }
    } catch { /* ignore */ }
  }, [token]);

  // Change artwork for a card in this set
  const handleArtworkChange = useCallback(async (cardId: number, artworkId: number) => {
    if (!token || !decodedName) return;
    const card = setCards.find((c) => c.id === cardId);
    if (!card) return;
    try {
      await assignCardToSet(token, decodedName, {
        cardId,
        rarity: card.rarity,
        rarityCode: card.rarity_code,
        artworkId,
      });
      await loadSetCards();
    } catch { /* ignore */ }
  }, [token, decodedName, setCards, loadSetCards]);

  const handleAddCard = useCallback(
    async (card: AdminCardRow, rarity: string) => {
      if (!token || !decodedName) return;
      const rarityCode = RARITY_CODE_MAP[rarity] ?? 'C';

      try {
        await assignCardToSet(token, decodedName, {
          cardId: card.id,
          rarity,
          rarityCode,
        });
        // Refresh set cards and set info
        await loadSetCards();
        await loadSetInfo();
      } catch {
        // Silently fail — the card was not added
      }
    },
    [token, decodedName, loadSetCards, loadSetInfo],
  );

  // Import from API + assign to set in one step
  const handleAddApiCard = useCallback(
    async (apiCard: any, rarity: string) => {
      if (!token || !decodedName) return;
      setImportingCard(apiCard.id);
      try {
        // Step 1: Import card into our DB
        await fetch(`${env.api.baseUrl}/admin/cards/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cardId: apiCard.id }),
        });

        // Step 2: Assign to set
        const rarityCode = RARITY_CODE_MAP[rarity] ?? 'C';
        await assignCardToSet(token, decodedName, { cardId: apiCard.id, rarity, rarityCode });

        // Refresh everything
        await loadSetCards();
        await loadSetInfo();
        // Remove from API results
        setApiResults((prev) => prev.filter((c) => c.id !== apiCard.id));
      } catch {
        // Silently fail
      } finally {
        setImportingCard(null);
      }
    },
    [token, decodedName, loadSetCards, loadSetInfo],
  );

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  if (!decodedName) {
    navigate('/app/admin/sets');
    return null;
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>{t('admin.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Link to="/app/admin/sets" className={styles.backLink}>
          {t('admin.backToSets')}
        </Link>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/app/admin/sets" className={styles.backLink}>
        {t('admin.backToSets')}
      </Link>

      {/* Section A: Set Info */}
      {setInfo && <SetInfoBar set={setInfo} t={t} />}

      {/* Add Cards — compact search at top */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('admin.addCards')}</h2>
        <AddCardsPanel
          search={addSearch}
          onSearchChange={handleAddSearchChange}
          results={addResults}
          apiResults={apiResults}
          loading={addLoading}
          setCardIds={setCardIds}
          onAdd={handleAddCard}
          onAddApi={handleAddApiCard}
          importingCard={importingCard}
          t={t}
        />
      </div>

      {/* Cards in this Set — full width table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('admin.cardsInSet')}</h2>
        <SetCardsTable
          cards={setCards}
          total={setCardsTotal}
          page={setCardsPage}
          onPageChange={setSetCardsPage}
          onRarityChange={handleRarityChange}
          onRemove={handleRemoveCard}
          onCardClick={openCardPopup}
          search={setCardsSearch}
          onSearchChange={handleSetCardsSearchChange}
          t={t}
        />
      </div>

      {/* Card Detail Popup with Artwork Selection */}
      {popupCardId && (() => {
        const card = setCards.find((c) => c.id === popupCardId);
        if (!card) return null;
        return (
          <CardDetailPopup
            card={{
              id: card.id,
              nameDe: card.name_de,
              nameEn: card.name_en,
              descDe: card.desc_de,
              descEn: card.desc_en,
              frameType: card.frame_type,
              atk: card.atk,
              def: card.def,
              level: card.level,
              attribute: card.attribute,
              race: card.race_de ?? card.race_en,
              archetype: card.archetype,
              rarity: card.rarity,
              artworkId: card.artwork_id,
            }}
            onClose={() => setPopupCardId(null)}
            artworks={popupArtworks}
            currentArtworkId={card.artwork_id}
            onArtworkChange={(artworkId) => handleArtworkChange(card.id, artworkId)}
          />
        );
      })()}
    </div>
  );
}
