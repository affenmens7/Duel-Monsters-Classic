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
  updateSet,
  type AdminSetRow,
  type SetCardRow,
  type AdminCardRow,
} from '../../services/admin';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import styles from './AdminSetDetail.module.css';

const RARITIES = ['Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'];
const BAN_STATUSES = ['Unlimited', 'Semi-Limited', 'Limited', 'Forbidden'];

import { getRarityTier, RARITY_ORDER, RARITY_SHORT } from '../../utils/rarity';
import { getSortArrow } from '../../utils/sortArrow';

const RARITY_CODE_MAP = RARITY_SHORT;

// Maps rarity tier to CSS module class
const RARITY_STYLE: Record<string, string> = {
  SecretRare: styles.raritySecretRare,
  UltraRare: styles.rarityUltraRare,
  SuperRare: styles.raritySuperRare,
  Rare: styles.rarityRare,
  ShortPrint: styles.rarityShortPrint,
  Common: styles.rarityCommon,
};

function rarityBadgeClass(rarity: string): string {
  return RARITY_STYLE[getRarityTier(rarity)] ?? styles.rarityCommon;
}

const SET_CARDS_LIMIT = 200;

// ============================================================
// SetInfoBar — top section with set metadata
// ============================================================

function SetInfoBar({
  set,
  t,
  onToggleActive,
}: {
  set: AdminSetRow;
  t: (key: string) => string;
  onToggleActive: () => void;
}) {
  return (
    <div className={styles.setHeader}>
      <h1 className={styles.setName}>{set.name}</h1>
      <span className={styles.badge}>{set.code}</span>
      <span className={styles.badge}>{set.product_type}</span>
      <span className={styles.badge}>Wave {set.wave}</span>
      <span
        className={`${styles.badge} ${set.active ? styles.badgeActive : styles.badgeInactive}`}
        onClick={onToggleActive}
        title={set.active ? t('admin.deactivate') : t('admin.activate')}
      >
        {set.active ? t('admin.statusActive') : t('admin.statusInactive')}
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

  const sortArrow = (key: SortKey) => getSortArrow(sortBy, sortDir, key);

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
            <colgroup><col /><col /><col /><col /><col /><col /><col /><col /></colgroup>
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
                <th className={styles.cardTh}>{t('admin.qty')}</th>
                <th className={styles.cardTh}>{t('admin.banStatus')}</th>
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
                  <td className={styles.cardTdQty}>{card.quantity}x</td>
                  <td className={styles.cardTd}>
                    <span className={`${styles.banBadge} ${styles[`ban${(card.ban_status ?? 'Unlimited').replace('-', '')}`]}`}>
                      {t(`banStatus.${card.ban_status ?? 'Unlimited'}`)}
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
  readonly onAdd: (card: AdminCardRow, rarity: string, quantity: number) => void;
  readonly onAddApi: (apiCard: any, rarity: string, quantity: number, banStatus: string) => void;
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
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [selectedBanStatus, setSelectedBanStatus] = useState<Record<number, string>>({});

  const getRarity = (cardId: number): string =>
    selectedRarities[cardId] ?? 'Common';

  const getQuantity = (cardId: number): number =>
    selectedQuantities[cardId] ?? 1;

  const getBanStatus = (cardId: number, defaultStatus?: string | null): string =>
    selectedBanStatus[cardId] ?? defaultStatus ?? 'Unlimited';

  const handleRarityChange = (cardId: number, rarity: string) => {
    setSelectedRarities((prev) => ({ ...prev, [cardId]: rarity }));
  };

  const handleQuantityChange = (cardId: number, qty: number) => {
    setSelectedQuantities((prev) => ({ ...prev, [cardId]: qty }));
  };

  const handleBanStatusChange = (cardId: number, status: string) => {
    setSelectedBanStatus((prev) => ({ ...prev, [cardId]: status }));
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
          <colgroup><col /><col /><col /><col /><col /><col /><col /><col /></colgroup>
          <thead>
            <tr>
              <th className={styles.cardTh}>{t('admin.image')}</th>
              <th className={styles.cardTh}>{t('admin.nameDe')}</th>
              <th className={styles.cardTh}>{t('admin.nameEn')}</th>
              <th className={styles.cardTh}>{t('admin.type')}</th>
              <th className={styles.cardTh}>{t('admin.rarity')}</th>
              <th className={styles.cardTh}>{t('admin.qty')}</th>
              <th className={styles.cardTh}>{t('admin.banStatus')}</th>
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
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className={styles.cardTd}>
                    {alreadyInSet ? (
                      <span className={styles.inSetMark}>{t('admin.inSet')}</span>
                    ) : (
                      <select
                        className={styles.raritySelect}
                        value={getQuantity(card.id)}
                        onChange={(e) => handleQuantityChange(card.id, Number(e.target.value))}
                      >
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={3}>3x</option>
                      </select>
                    )}
                  </td>
                  <td className={styles.cardTd}>
                    {alreadyInSet ? (
                      <span className={styles.inSetMark}>{t('admin.inSet')}</span>
                    ) : (
                      <span className={`${styles.banBadge} ${styles[`ban${(card.ban_status ?? 'Unlimited').replace('-', '')}`] ?? ''}`}>
                        {t(`banStatus.${card.ban_status ?? 'Unlimited'}`)}
                      </span>
                    )}
                  </td>
                  <td className={styles.cardTd}>
                    {alreadyInSet ? (
                      <span className={styles.inSetMark}>{t('admin.inSet')}</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => onAdd(card, getRarity(card.id), getQuantity(card.id))}
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

      {/* API results — cards not yet in our DB (same layout as DB table) */}
      {!loading && apiResults.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: '16px', fontSize: '0.65rem' }}>
            {t('admin.importFromYgopro')} ({apiResults.length})
          </h4>
          <table className={styles.cardTable}>
            <colgroup><col /><col /><col /><col /><col /><col /><col /><col /></colgroup>
            <thead>
              <tr>
                <th className={styles.cardTh}>{t('admin.image')}</th>
                <th className={styles.cardTh}>{t('admin.nameDe')}</th>
                <th className={styles.cardTh}>{t('admin.nameEn')}</th>
                <th className={styles.cardTh}>{t('admin.type')}</th>
                <th className={styles.cardTh}>{t('admin.rarity')}</th>
                <th className={styles.cardTh}>{t('admin.qty')}</th>
                <th className={styles.cardTh}>{t('admin.banStatus')}</th>
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
                    <select
                      className={styles.raritySelect}
                      value={getQuantity(card.id)}
                      onChange={(e) => handleQuantityChange(card.id, Number(e.target.value))}
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={3}>3x</option>
                    </select>
                  </td>
                  <td className={styles.cardTd}>
                    <select
                      className={styles.raritySelect}
                      value={getBanStatus(card.id)}
                      onChange={(e) => handleBanStatusChange(card.id, e.target.value)}
                    >
                      {BAN_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`banStatus.${s}`)}</option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.cardTd}>
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => onAddApi(card, getRarity(card.id), getQuantity(card.id), getBanStatus(card.id))}
                      disabled={importingCard === card.id}
                    >
                      {importingCard === card.id ? '...' : t('admin.add')}
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

  // Toggle active/inactive status
  const handleToggleActive = useCallback(async () => {
    if (!token || !decodedName) return;
    const prev = setInfo?.active ?? false;
    const next = !prev;
    // Optimistic update
    setSetInfo((s) => s ? { ...s, active: next } : s);
    try {
      await updateSet(token, decodedName, { active: next } as never);
    } catch {
      // Revert on failure
      setSetInfo((s) => s ? { ...s, active: prev } : s);
    }
  }, [token, decodedName, setInfo?.active]);

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

  // Fetch artworks first, then show popup (so artworks are visible immediately)
  const [popupLoading, setPopupLoading] = useState(false);
  const openCardPopup = useCallback(async (cardId: number) => {
    if (!token) return;
    setPopupLoading(true);
    try {
      const res = await fetch(`${env.api.baseUrl}/admin/cards/${cardId}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setPopupArtworks(data);
    } catch {
      setPopupArtworks([]);
    }
    setPopupCardId(cardId);
    setPopupLoading(false);
  }, [token]);

  // Change quantity for a card in this set
  const handleQuantityChange = useCallback(async (cardId: number, newQty: number) => {
    if (!token || !decodedName) return;
    const card = setCards.find((c) => c.id === cardId);
    if (!card) return;
    const clamped = Math.max(1, Math.min(3, newQty));
    // Optimistic update
    setSetCards((prev) => prev.map((c) => c.id === cardId ? { ...c, quantity: clamped } : c));
    try {
      await assignCardToSet(token, decodedName, {
        cardId,
        rarity: card.rarity,
        rarityCode: card.rarity_code,
        quantity: clamped,
      });
      await loadSetInfo();
    } catch {
      setSetCards((prev) => prev.map((c) => c.id === cardId ? { ...c, quantity: card.quantity } : c));
    }
  }, [token, decodedName, setCards, loadSetInfo]);

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
        quantity: card.quantity,
      });
      await loadSetCards();
    } catch { /* ignore */ }
  }, [token, decodedName, setCards, loadSetCards]);

  const handleAddCard = useCallback(
    async (card: AdminCardRow, rarity: string, quantity: number = 1) => {
      if (!token || !decodedName) return;
      const rarityCode = RARITY_CODE_MAP[rarity] ?? 'C';

      try {
        await assignCardToSet(token, decodedName, {
          cardId: card.id,
          rarity,
          rarityCode,
          quantity,
        });
        await loadSetCards();
        await loadSetInfo();
      } catch {
        // Silently fail
      }
    },
    [token, decodedName, loadSetCards, loadSetInfo],
  );

  // Import from API + assign to set in one step
  const handleAddApiCard = useCallback(
    async (apiCard: any, rarity: string, quantity: number = 1, banStatus: string = 'Unlimited') => {
      if (!token || !decodedName) return;
      setImportingCard(apiCard.id);
      try {
        // Step 1: Import card into our DB
        await fetch(`${env.api.baseUrl}/admin/cards/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cardId: apiCard.id }),
        });

        // Step 2: Update ban status if not Unlimited
        if (banStatus !== 'Unlimited') {
          await fetch(`${env.api.baseUrl}/admin/cards/${apiCard.id}/ban`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ banStatus }),
          });
        }

        // Step 3: Assign to set with quantity
        const rarityCode = RARITY_CODE_MAP[rarity] ?? 'C';
        await assignCardToSet(token, decodedName, { cardId: apiCard.id, rarity, rarityCode, quantity });

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

  const backPath = setInfo?.type === 'starter'
    ? '/app/admin/sets/starter'
    : '/app/admin/sets/booster';

  if (!decodedName) {
    navigate(backPath);
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
        <Link to={backPath} className={styles.backLink}>
          {t('admin.backToSets')}
        </Link>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to={backPath} className={styles.backLink}>
        {t('admin.backToSets')}
      </Link>

      {/* Section A: Set Info */}
      {setInfo && (
        <SetInfoBar
          set={setInfo}
          t={t}
          onToggleActive={handleToggleActive}
        />
      )}

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
        <h2 className={styles.sectionTitle}>{t('admin.cardsInSet')} ({setInfo?.card_count ?? 0})</h2>
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

      {/* Loading overlay while artworks are fetched */}
      {popupLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>{t('admin.loading')}</div>
        </div>
      )}

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
              sets: [{ name: decodedName ?? '', code: setInfo?.code ?? '' }],
              banStatus: card.ban_status,
            }}
            onClose={() => setPopupCardId(null)}
            artworks={popupArtworks}
            effectPreviewMode
            onSetClick={(setName) => navigate(`/app/admin/sets/${encodeURIComponent(setName)}`)}
            currentArtworkId={card.artwork_id}
            onArtworkChange={(artworkId) => handleArtworkChange(card.id, artworkId)}
          >
            {/* Quantity controls */}
            <div className={styles.quantityRow}>
              <span className={styles.quantityLabel}>{t('admin.quantity')}</span>
              <div className={styles.quantityControls}>
                <button
                  className={styles.quantityBtn}
                  disabled={card.quantity <= 1}
                  onClick={() => handleQuantityChange(card.id, card.quantity - 1)}
                >
                  −
                </button>
                <span className={styles.quantityValue}>{card.quantity}</span>
                <button
                  className={styles.quantityBtn}
                  disabled={card.quantity >= 3}
                  onClick={() => handleQuantityChange(card.id, card.quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </CardDetailPopup>
        );
      })()}
    </div>
  );
}
