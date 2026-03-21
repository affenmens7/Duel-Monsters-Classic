/**
 * AdminCardsPage — paginated card database browser with search,
 * frame type / attribute filters, and a card detail popup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useAppData } from '../../store/AppDataContext';
import {
  fetchAdminCards,
  type AdminCardRow,
} from '../../services/admin';
import { env } from '../../config/env';
import { getSortArrow } from '../../utils/sortArrow';
import { getCardImageUrl } from '../../services/cardApi';
import { CardDetailPopup } from '../../components/common/CardDetailPopup';
import { Modal } from '../../components/common/Modal';
import styles from './AdminCards.module.css';

const PAGE_SIZE = 50;

export function AdminCardsPage() {
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { cards: cachedCards } = useAppData();
  const isEn = i18n.language === 'en';

  const FRAME_TYPE_OPTIONS = [
    { value: '', label: t('admin.allTypes') },
    { value: 'normal', label: t('admin.frameNormal') },
    { value: 'effect', label: t('admin.frameEffect') },
    { value: 'ritual', label: t('admin.frameRitual') },
    { value: 'fusion', label: t('admin.frameFusion') },
    { value: 'spell', label: t('admin.frameSpell') },
    { value: 'trap', label: t('admin.frameTrap') },
  ];

  const ATTRIBUTE_OPTIONS = [
    { value: '', label: t('admin.allAttributes') },
    { value: 'DARK', label: 'DARK' },
    { value: 'LIGHT', label: 'LIGHT' },
    { value: 'EARTH', label: 'EARTH' },
    { value: 'WATER', label: 'WATER' },
    { value: 'FIRE', label: 'FIRE' },
    { value: 'WIND', label: 'WIND' },
  ];

  // Data
  const [cards, setCards] = useState<AdminCardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters + sorting
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [frameType, setFrameType] = useState('');
  const [attribute, setAttribute] = useState('');
  const [sortBy, setSortBy] = useState(() => isEn ? 'name_en' : 'name_de');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Popup + artworks
  const [popupCard, setPopupCard] = useState<AdminCardRow | null>(null);
  const [popupArtworks, setPopupArtworks] = useState<any[]>([]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminCardRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import from YGOPRODeck
  const [showImport, setShowImport] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const importDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  // Reset page when filters change
  const handleFrameTypeChange = useCallback((value: string) => {
    setFrameType(value);
    setPage(1);
  }, []);

  const handleAttributeChange = useCallback((value: string) => {
    setAttribute(value);
    setPage(1);
  }, []);

  // Fetch cards
  const loadCards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await fetchAdminCards(token, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        frameType: frameType || undefined,
        attribute: attribute || undefined,
        sortBy,
        sortDir,
      });
      setCards(result.cards);
      setTotal(result.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, frameType, attribute, sortBy, sortDir, t]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Sort handler — click column header to toggle
  const handleSort = useCallback((col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortBy]);

  const sortArrow = (col: string) => getSortArrow(sortBy, sortDir, col);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Import search handler
  const handleImportSearch = useCallback((value: string) => {
    setImportSearch(value);
    if (importDebounce.current) clearTimeout(importDebounce.current);
    if (value.length < 2) { setImportResults([]); return; }
    importDebounce.current = setTimeout(async () => {
      if (!token) return;
      setImportLoading(true);
      try {
        const res = await fetch(`${env.api.baseUrl}/admin/cards/search-api?search=${encodeURIComponent(value)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setImportResults(data.cards ?? []);
      } catch { setImportResults([]); }
      finally { setImportLoading(false); }
    }, 500);
  }, [token]);

  const handleImportCard = useCallback(async (cardId: number) => {
    if (!token || importing) return;
    setImporting(cardId);
    setImportMsg('');
    try {
      const res = await fetch(`${env.api.baseUrl}/admin/cards/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(`${data.nameDe ?? data.name} ${t('admin.imported')}`);
        setImportResults((prev) => prev.map((c) => c.id === cardId ? { ...c, already_imported: true } : c));
        // Clear public card browser cache so new cards show immediately
        localStorage.removeItem('dmc-cards-v3');
        loadCards();
      } else {
        setImportMsg(data.error ?? t('admin.error'));
      }
    } catch { setImportMsg(t('admin.importFailed')); }
    finally { setImporting(null); }
  }, [token, importing, loadCards, t]);

  // Fetch artworks first, then show popup (so artworks are visible immediately)
  const [popupLoading, setPopupLoading] = useState(false);
  const openCardPopup = useCallback(async (card: AdminCardRow) => {
    if (!token) return;
    setPopupLoading(true);
    try {
      const res = await fetch(`${env.api.baseUrl}/admin/cards/${card.id}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const arts = res.ok ? await res.json() : [];
      setPopupArtworks(arts);
    } catch {
      setPopupArtworks([]);
    }
    setPopupCard(card);
    setPopupLoading(false);
  }, [token]);

  // Delete card handler
  const handleDeleteCard = useCallback(async () => {
    if (!token || !deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`${env.api.baseUrl}/admin/cards/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteConfirm(null);
        setPopupCard(null);
        setPopupArtworks([]);
        loadCards();
      }
    } catch { /* ignore */ }
    setDeleting(false);
  }, [token, deleteConfirm, loadCards]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formatFrameType = (ft: string): string => {
    const found = FRAME_TYPE_OPTIONS.find((o) => o.value === ft);
    return found ? found.label : ft;
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('admin.cardDatabase')}</h1>

      {/* Toolbar: Search + Filters */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder={t('admin.searchCard')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={frameType}
          onChange={(e) => handleFrameTypeChange(e.target.value)}
        >
          {FRAME_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={attribute}
          onChange={(e) => handleAttributeChange(e.target.value)}
        >
          {ATTRIBUTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.totalCount}>{total} {t('admin.cards')}</span>
        <button className={styles.importBtn} onClick={() => { setShowImport(true); setImportSearch(''); setImportResults([]); setImportMsg(''); }}>
          {t('admin.importCard')}
        </button>
      </div>

      {/* Error */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Loading */}
      {loading && !error && <p className={styles.loading}>{t('admin.loading')}</p>}

      {/* Table */}
      {!loading && !error && cards.length === 0 && (
        <p className={styles.empty}>{t('admin.noResults')}</p>
      )}

      {!loading && !error && cards.length > 0 && (
        <>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>{t('admin.image')}</th>
                <th className={styles.thSortable} onClick={() => handleSort(isEn ? 'name_en' : 'name_de')}>
                  {t('admin.name')}{sortArrow(isEn ? 'name_en' : 'name_de')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort(isEn ? 'name_de' : 'name_en')}>
                  {isEn ? t('admin.nameDe') : t('admin.nameEn')}{sortArrow(isEn ? 'name_de' : 'name_en')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('frame_type')}>
                  {t('admin.type')}{sortArrow('frame_type')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('atk')}>
                  ATK/DEF{sortArrow('atk')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('level')}>
                  {t('admin.level')}{sortArrow('level')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('attribute')}>
                  {t('admin.attribute')}{sortArrow('attribute')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('ban_status')}>
                  {t('admin.banStatus')}{sortArrow('ban_status')}
                </th>
                <th className={styles.thSortable} onClick={() => handleSort('rarity')}>
                  Rarity{sortArrow('rarity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr
                  key={card.id}
                  className={styles.tr}
                  onClick={() => openCardPopup(card)}
                >
                  <td className={styles.td}>
                    <img
                      className={styles.thumb}
                      src={getCardImageUrl(card.id, 'small', card.default_artwork_id ?? undefined)}
                      alt=""
                      loading="lazy"
                    />
                  </td>
                  <td className={styles.td}>{isEn ? card.name_en : card.name_de}</td>
                  <td className={styles.tdMuted}>{isEn ? card.name_de : card.name_en}</td>
                  <td className={styles.tdCode}>{formatFrameType(card.frame_type)}</td>
                  <td className={styles.td}>
                    {card.atk !== null
                      ? `${card.atk} / ${card.def ?? '?'}`
                      : '\u2014'}
                  </td>
                  <td className={styles.td}>
                    {card.level ?? '\u2014'}
                  </td>
                  <td className={styles.tdCode}>
                    {card.attribute
                      ? t(`attributes.${card.attribute}`, card.attribute)
                      : (card.frame_type === 'spell' || card.frame_type === 'trap')
                        ? t(`spellTrapType.${card.race_en}`, card.race_en)
                        : '\u2014'}
                  </td>
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`${styles.inlineSelect} ${styles[`ban${(card.ban_status ?? 'Unlimited').replace('-', '')}`]}`}
                      value={card.ban_status ?? ''}
                      onChange={async (e) => {
                        if (!token) return;
                        const val = e.target.value || null;
                        try {
                          await fetch(`${env.api.baseUrl}/admin/cards/${card.id}/ban`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ banStatus: val }),
                          });
                          loadCards();
                        } catch { /* ignore */ }
                      }}
                    >
                      <option value="">{t('banStatus.Unlimited')}</option>
                      <option value="Semi-Limited">{t('banStatus.Semi-Limited')}</option>
                      <option value="Limited">{t('banStatus.Limited')}</option>
                      <option value="Forbidden">{t('banStatus.Forbidden')}</option>
                    </select>
                  </td>
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                    <select
                      className={`${styles.inlineSelect} ${styles[`rarity${(card.rarity ?? 'Common').replace(/\s/g, '')}`]}`}
                      value={card.rarity ?? 'Common'}
                      onChange={async (e) => {
                        if (!token) return;
                        try {
                          await fetch(`${env.api.baseUrl}/admin/cards/${card.id}/rarity`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ rarity: e.target.value }),
                          });
                          loadCards();
                        } catch { /* ignore */ }
                      }}
                    >
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Super Rare">Super Rare</option>
                      <option value="Ultra Rare">Ultra Rare</option>
                      <option value="Secret Rare">Secret Rare</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('admin.prev')}
            </button>
            <span className={styles.pageInfo}>
              {t('admin.page')} {page} {t('admin.of')} {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('admin.next')}
            </button>
          </div>
        </>
      )}

      {/* Loading overlay while artworks are fetched */}
      {popupLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>{t('admin.loading')}</div>
        </div>
      )}

      {/* Card Detail Popup */}
      {popupCard && (
        <CardDetailPopup
          card={{
            id: popupCard.id,
            nameDe: popupCard.name_de,
            nameEn: popupCard.name_en,
            descDe: popupCard.desc_de,
            descEn: popupCard.desc_en,
            frameType: popupCard.frame_type,
            atk: popupCard.atk,
            def: popupCard.def,
            level: popupCard.level,
            attribute: popupCard.attribute,
            race: popupCard.race_de || popupCard.race_en,
            archetype: popupCard.archetype,
            artworkId: popupCard.default_artwork_id,
            sets: cachedCards.find((c) => c.id === popupCard.id)?.sets,
            banStatus: popupCard.ban_status,
            rarity: popupCard.rarity,
          }}
          onClose={() => { setPopupCard(null); setPopupArtworks([]); }}
          artworks={popupArtworks}
          onSetClick={(setName) => navigate(`/app/admin/sets/booster/${encodeURIComponent(setName)}`)}
          effectPreviewMode
          currentArtworkId={popupCard.default_artwork_id}
          onArtworkChange={async (artworkId) => {
            if (!token || !popupCard) return;
            try {
              await fetch(`${env.api.baseUrl}/admin/cards/${popupCard.id}/artworks/${artworkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isDefault: true }),
              });
              setPopupCard({ ...popupCard, default_artwork_id: artworkId });
              loadCards();
            } catch { /* ignore */ }
          }}
        >
          <div className={styles.popupActions}>
            <button
              className={styles.deleteCardBtn}
              onClick={() => { setDeleteConfirm(popupCard); setPopupCard(null); setPopupArtworks([]); }}
            >
              {t('admin.deleteCard')}
            </button>
          </div>
        </CardDetailPopup>
      )}

      {/* API Card Detail Popup */}
      {previewCard && (
        <CardDetailPopup
          card={{
            id: previewCard.id,
            nameDe: previewCard.name_de,
            nameEn: previewCard.name_en,
            frameType: previewCard.frame_type,
            atk: previewCard.atk,
            def: previewCard.def,
            level: previewCard.level,
            attribute: previewCard.attribute,
            race: previewCard.race_en,
          }}
          onClose={() => setPreviewCard(null)}
        >
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6rem', color: previewCard.already_imported ? 'var(--orichalcos-light)' : 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {previewCard.already_imported ? t('admin.alreadyInDbDetail') : t('admin.notImported')}
          </div>
        </CardDetailPopup>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className={styles.modalOverlay} onClick={() => setShowImport(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('admin.importFromApi')}</h2>
              <button className={styles.modalClose} onClick={() => setShowImport(false)}>x</button>
            </div>
            <input
              className={styles.searchInput}
              type="text"
              placeholder={t('admin.searchCardEn')}
              value={importSearch}
              onChange={(e) => handleImportSearch(e.target.value)}
              autoFocus
            />
            {importMsg && <p className={styles.importMsg}>{importMsg}</p>}
            {importLoading && <p className={styles.loading}>{t('admin.searching')}</p>}
            {importResults.length > 0 && (
              <div className={styles.importResults}>
                {importResults.map((card) => (
                  <div key={card.id} className={`${styles.importRow} ${card.already_imported ? styles.importRowDone : ''}`}>
                    <div className={styles.importArtworks}>
                      {(card.artworks ?? [{ artwork_id: card.id, image_url_small: card.image_url_small, image_url: card.image_url }]).map((art: any) => (
                        <img
                          key={art.artwork_id}
                          className={styles.importThumb}
                          src={art.image_url_small}
                          alt=""
                          loading="lazy"
                          onClick={(e) => { e.stopPropagation(); setPreviewCard({ ...card, image_url: art.image_url }); }}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                    <div className={styles.importInfo}>
                      <span className={styles.importName}>{card.name_de}</span>
                      <span className={styles.importNameEn}>{card.name_en}</span>
                      {card.artworks?.length > 1 && (
                        <span className={styles.importArtworkCount}>{card.artworks.length} Artworks</span>
                      )}
                    </div>
                    <span className={styles.importType}>{card.frame_type}</span>
                    {card.already_imported ? (
                      <span className={styles.importDone}>{t('admin.alreadyInDb')}</span>
                    ) : (
                      <button
                        className={styles.importCardBtn}
                        onClick={() => handleImportCard(card.id)}
                        disabled={importing === card.id}
                      >
                        {importing === card.id ? '...' : t('admin.import')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!importLoading && importSearch.length >= 2 && importResults.length === 0 && (
              <p className={styles.empty}>{t('admin.noImportResults')}</p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t('admin.deleteCardTitle')}
      >
        {deleteConfirm && (
          <div className={styles.deleteConfirm}>
            <p className={styles.deleteWarning}>{t('admin.deleteCardWarning')}</p>
            <p className={styles.deleteCardName}>
              {isEn ? deleteConfirm.name_en : deleteConfirm.name_de}
            </p>
            <p className={styles.deleteCardId}>ID: {deleteConfirm.id}</p>
            <div className={styles.deleteActions}>
              <button
                className={styles.deleteCancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                {t('admin.cancel')}
              </button>
              <button
                className={styles.deleteConfirmBtn}
                onClick={handleDeleteCard}
                disabled={deleting}
              >
                {deleting ? '...' : t('admin.deleteConfirm')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
