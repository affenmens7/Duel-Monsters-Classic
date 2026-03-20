/**
 * AdminSetsPage — table of card sets with a gear icon per row
 * that opens a SettingsModal for editing.
 * Context-aware: "sets" shows set settings, "shop" shows shop config + rarity rates.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import { env } from '../../config/env';
import {
  fetchAdminSets,
  fetchSetRates,
  fetchSetRarities,
  fetchSetCards,
  updateSet,
  updateSetConfig,
  updateSetRates,
  createSet,
  importSetCards,
  deleteSet,
  searchApiSets,
  type AdminSetRow,
  type RarityRate,
  type ApiSetResult,
} from '../../services/admin';
import { getCardImageUrl } from '../../services/cardApi';
import { SettingsModal, settingsModalStyles as ms } from '../../components/admin/SettingsModal';
import { ReleaseModal } from '../../components/admin/ReleaseModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import styles from './AdminSets.module.css';

// ============================================================
// Local form state types
// ============================================================

interface SetForm {
  wave: number;
  releaseDate: string;
}

interface ConfigForm {
  pricePack: number;
  packSize: number;
  descDe: string;
  descEn: string;
  sortOrder: number;
  shopVisible: boolean;
  showcaseAnimated: boolean;
  igReleaseDate: string;
}

// ============================================================
// AdminSetsPage
// ============================================================

export function AdminSetsPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const routeFilter = location.pathname.includes('booster')
    ? 'booster'
    : location.pathname.includes('starter')
      ? 'starter'
      : null;

  const context = location.pathname.includes('/shop/') ? 'shop' : 'sets';

  const pageTitle = routeFilter === 'booster'
    ? t('admin.boosterPacks')
    : routeFilter === 'starter'
      ? t('admin.starterDecks')
      : t('admin.manageSetsTitle');

  // Data
  const [sets, setSets] = useState<AdminSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalRow, setModalRow] = useState<AdminSetRow | null>(null);
  const [setForm, setSetForm] = useState<SetForm | null>(null);
  const [configForm, setConfigForm] = useState<ConfigForm | null>(null);
  const [ratesForm, setRatesForm] = useState<RarityRate[]>([]);
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Showcase card picker state (shop context)
  const [showcaseCards, setShowcaseCards] = useState<number[]>([]);
  const [setCardOptions, setSetCardOptions] = useState<{ id: number; name_de: string; name_en: string }[]>([]);

  // Inline pack_size + price editing
  const [localPackSizes, setLocalPackSizes] = useState<Record<string, number>>({});
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});

  // Release modal state
  const [releaseRow, setReleaseRow] = useState<AdminSetRow | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'api' | 'custom'>('api');
  const [createForm, setCreateForm] = useState({ name: '', code: '', type: routeFilter ?? 'booster', wave: 0, releaseDate: '' });
  const [apiSearch, setApiSearch] = useState('');
  const [apiDebouncedSearch, setApiDebouncedSearch] = useState('');
  const [apiResults, setApiResults] = useState<ApiSetResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const apiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load sets
  const loadSets = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchAdminSets(token);
      setSets(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { loadSets(); }, [loadSets]);

  // Inline pack_size save on blur
  const handlePackSizeSave = useCallback(async (setName: string) => {
    const newSize = localPackSizes[setName];
    if (newSize === undefined || !token) return;
    const row = sets.find((s) => s.name === setName);
    if (!row || newSize === row.pack_size) {
      setLocalPackSizes((p) => { const next = { ...p }; delete next[setName]; return next; });
      return;
    }
    try {
      await updateSetConfig(token, setName, { pack_size: newSize });
      await loadSets();
    } catch { /* ignore */ }
    finally {
      setLocalPackSizes((p) => { const next = { ...p }; delete next[setName]; return next; });
    }
  }, [token, localPackSizes, sets, loadSets]);

  // Inline price save on blur
  const handlePriceSave = useCallback(async (setName: string) => {
    const newPrice = localPrices[setName];
    if (newPrice === undefined || !token) return;
    const row = sets.find((s) => s.name === setName);
    if (!row || newPrice === row.price_pack) {
      setLocalPrices((p) => { const next = { ...p }; delete next[setName]; return next; });
      return;
    }
    try {
      await updateSetConfig(token, setName, { price_pack: newPrice });
      await loadSets();
    } catch { /* ignore */ }
    finally {
      setLocalPrices((p) => { const next = { ...p }; delete next[setName]; return next; });
    }
  }, [token, localPrices, sets, loadSets]);

  // API search debounce
  const handleApiSearchChange = useCallback((value: string) => {
    setApiSearch(value);
    if (apiDebounceRef.current) clearTimeout(apiDebounceRef.current);
    apiDebounceRef.current = setTimeout(() => setApiDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => { if (apiDebounceRef.current) clearTimeout(apiDebounceRef.current); };
  }, []);

  useEffect(() => {
    if (!token || apiDebouncedSearch.length < 2) { setApiResults([]); return; }
    let cancelled = false;
    setApiLoading(true);
    searchApiSets(token, apiDebouncedSearch, routeFilter ?? undefined)
      .then((results) => { if (!cancelled) setApiResults(results); })
      .catch(() => { if (!cancelled) setApiResults([]); })
      .finally(() => { if (!cancelled) setApiLoading(false); });
    return () => { cancelled = true; };
  }, [token, apiDebouncedSearch, routeFilter]);

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateMode('api');
    setCreateForm({ name: '', code: '', type: routeFilter ?? 'booster', wave: 0, releaseDate: '' });
    setApiSearch('');
    setApiDebouncedSearch('');
    setApiResults([]);
    setCreateResult(null);
  };

  const handleSelectApiSet = (result: ApiSetResult) => {
    if (result.already_exists) return;
    setCreateForm({
      name: result.set_name,
      code: result.set_code,
      type: routeFilter ?? 'booster',
      wave: 0,
      releaseDate: result.tcg_date ?? '',
    });
  };

  // Import progress message (shown in modal during card import)
  const [importStatus, setImportStatus] = useState('');

  const handleCreateSet = useCallback(async () => {
    if (!token || !createForm.name || !createForm.code) {
      setCreateResult({ ok: false, msg: t('admin.requiredFields') });
      return;
    }

    // Check if set already exists — if so and API mode, just run the import
    const existingSet = sets.find((s) => s.name === createForm.name);
    const needsCreate = !existingSet;

    setCreating(true);
    setCreateResult(null);
    setImportStatus('');
    try {
      if (needsCreate) {
        await createSet(token, {
          name: createForm.name,
          code: createForm.code,
          type: createForm.type,
          wave: createForm.wave,
          og_release_date: createForm.releaseDate || undefined,
        });
      }

      // Auto-import cards when using API mode (works for new sets and re-imports)
      if (createMode === 'api') {
        setImportStatus(t('admin.importingCards'));
        const result = await importSetCards(token, createForm.name);
        setImportStatus('');
        setCreateResult({
          ok: true,
          msg: t('admin.importComplete', {
            inserted: result.cardsInserted,
            skipped: result.cardsSkipped,
            artworks: result.artworksInserted,
            images: result.imagesDownloaded,
          }),
        });
        // User reviews the result — navigation happens when modal is closed
        return;
      }

      setCreateOpen(false);
      await loadSets();
      navigate(`/app/admin/sets/${createForm.type ?? 'booster'}/${encodeURIComponent(createForm.name)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.createFailed');
      setCreateResult({ ok: false, msg });
    } finally {
      setCreating(false);
      setImportStatus('');
    }
  }, [token, createForm, createMode, sets, loadSets, navigate, t]);

  // After successful import: navigate to detail page
  const handlePostImportNavigate = useCallback(async () => {
    setCreateOpen(false);
    await loadSets();
    navigate(`/app/admin/sets/${createForm.type ?? 'booster'}/${encodeURIComponent(createForm.name)}`);
  }, [createForm.name, createForm.type, loadSets, navigate]);

  // Close create modal — just close, no navigation
  const handleCloseCreateModal = useCallback(() => {
    if (creating) return;
    setCreateOpen(false);
    setCreateResult(null);
    loadSets();
  }, [creating, loadSets]);

  // Filtered + sorted sets based on route (wave asc, release date asc)
  const filteredSets = useMemo(() => {
    const list = routeFilter ? sets.filter((s) => s.product_type === routeFilter) : [...sets];
    return list.sort((a, b) => {
      if (a.wave !== b.wave) return a.wave - b.wave;
      const dateA = a.og_release_date ?? '';
      const dateB = b.og_release_date ?? '';
      return dateA.localeCompare(dateB);
    });
  }, [sets, routeFilter]);

  // Open modal for a row
  const openModal = useCallback(async (row: AdminSetRow) => {
    setSaveResult(null);
    setModalRow(row);
    setSetForm({ wave: row.wave, releaseDate: row.og_release_date ?? '' });
    setConfigForm({
      pricePack: row.price_pack,
      packSize: row.pack_size,
      descDe: row.desc_de,
      descEn: row.desc_en,
      sortOrder: row.sort_order,
      shopVisible: row.shop_visible ?? true,
      showcaseAnimated: row.showcase_animated ?? false,
      igReleaseDate: row.ig_release_date ? row.ig_release_date.split('T')[0] : '',
    });
    if (token && context === 'sets') {
      try {
        const [rates, rarities] = await Promise.all([
          fetchSetRates(token, row.name),
          fetchSetRarities(token, row.name),
        ]);
        setAvailableRarities(rarities);
        if (rates.length === 0 && rarities.length > 0) {
          setRatesForm(rarities.map((r) => ({ rarity: r, ratePct: 0 })));
        } else {
          setRatesForm(rates);
        }
      } catch {
        setRatesForm([]);
        setAvailableRarities([]);
      }
    }
    // Load set cards for showcase picker (shop context)
    if (token && context === 'shop') {
      setShowcaseCards(row.showcase_card_ids ?? []);
      try {
        const result = await fetchSetCards(token, row.name, { limit: 200 });
        setSetCardOptions(result.cards.map((c) => ({ id: c.id, name_de: c.name_de, name_en: c.name_en })));
      } catch {
        setSetCardOptions([]);
      }
    }
  }, [token, context]);

  const closeModal = () => {
    setModalRow(null);
    setSaveResult(null);
  };

  // Delete flow: null → 'confirm' → 'deleteCards' → execute
  const [deleteStep, setDeleteStep] = useState<null | 'confirm' | 'deleteCards'>(null);
  const [exclusiveCards, setExclusiveCards] = useState<{ id: number; name_de: string; name_en: string; frame_type: string }[]>([]);
  const [exclusiveLoading, setExclusiveLoading] = useState(false);

  const handleDeleteSet = useCallback(() => {
    if (!modalRow) return;
    setDeleteStep('confirm');
  }, [modalRow]);

  // Transition to step 2: fetch exclusive cards preview
  const handleShowDeleteCards = useCallback(async () => {
    if (!token || !modalRow) return;
    setExclusiveLoading(true);
    setDeleteStep('deleteCards');
    try {
      const res = await fetch(
        `${env.api.baseUrl}/admin/sets/${encodeURIComponent(modalRow.name)}/exclusive-cards`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.ok ? await res.json() : { cards: [] };
      setExclusiveCards(data.cards);
    } catch {
      setExclusiveCards([]);
    } finally {
      setExclusiveLoading(false);
    }
  }, [token, modalRow]);

  const executeDelete = useCallback(async (alsoDeleteCards: boolean) => {
    if (!token || !modalRow) return;
    setDeleteStep(null);
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await deleteSet(token, modalRow.name, alsoDeleteCards);
      closeModal();
      setExclusiveCards([]);
      await loadSets();
    } catch (err) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : t('admin.deleteFailed') });
    } finally {
      setSaving(false);
    }
  }, [token, modalRow, loadSets, t]);

  // Save
  const handleSave = useCallback(async () => {
    if (!token || !modalRow) return;
    setSaving(true);
    setSaveResult(null);

    const promises: Promise<unknown>[] = [];
    if (context === 'sets' && setForm) {
      promises.push(updateSet(token, modalRow.name, {
        wave: setForm.wave,
        og_release_date: setForm.releaseDate || undefined,
      } as never));
      promises.push(updateSetRates(token, modalRow.name, ratesForm));
    }
    if (context === 'shop' && configForm) {
      promises.push(
        updateSetConfig(token, modalRow.name, {
          price_pack: configForm.pricePack,
          pack_size: configForm.packSize,
          desc_de: configForm.descDe,
          desc_en: configForm.descEn,
          sort_order: configForm.sortOrder,
          showcase_animated: configForm.showcaseAnimated,
          showcase_card_ids: showcaseCards.length > 0 ? showcaseCards : null,
          ig_release_date: configForm.igReleaseDate || null,
        }),
      );
    }

    const results = await Promise.allSettled(promises);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === 0) {
      setSaveResult({ ok: true, msg: t('admin.saved') });
      await loadSets();
    } else {
      const reason = failed[0].status === 'rejected' ? (failed[0].reason as Error).message : t('admin.unknownError');
      setSaveResult({ ok: false, msg: reason });
    }
    setSaving(false);
  }, [token, modalRow, setForm, configForm, ratesForm, context, loadSets, t]);

  // Rarity rates helpers
  const ratesSum = ratesForm.reduce((sum, r) => sum + Number(r.ratePct), 0);

  // Render
  if (loading) return <div className={styles.page}><p className={styles.loading}>{t('admin.loading')}</p></div>;
  if (error) return <div className={styles.page}><p className={styles.error}>{error}</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{pageTitle}</h1>
        {context === 'sets' && (
          <button className={styles.createBtn} onClick={openCreateModal}>
            {routeFilter === 'starter' ? t('admin.createStarter') : t('admin.createSet')}
          </button>
        )}
      </div>

      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.th}>{t('admin.name')}</th>
            <th className={styles.th}>{t('admin.code')}</th>
            <th className={styles.th}>{t('admin.wave')}</th>
            {context === 'sets' && (
              <th className={styles.th}>{t('admin.ogRelease')}</th>
            )}
            {context === 'shop' && (
              <th className={styles.th}>{t('admin.release')}</th>
            )}
            <th className={styles.th}>{t('admin.cards')}</th>
            {context === 'shop' && routeFilter === 'booster' && (
              <th className={styles.th}>{t('admin.packSize')}</th>
            )}
            {context === 'shop' && (routeFilter === 'booster' || routeFilter === 'starter') && (
              <th className={styles.th}>{routeFilter === 'starter' ? t('admin.deckPrice') : t('admin.packPrice')}</th>
            )}
            {context === 'shop' && (
              <th className={styles.th}>{t('admin.shopVisibility')}</th>
            )}
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {filteredSets.map((row) => (
            <tr key={row.name} className={styles.tr}>
              <td
                className={styles.td}
                style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }}
                onClick={() => navigate(`/app/admin/sets/${row.product_type ?? 'booster'}/${encodeURIComponent(row.name)}`)}
              >
                {row.name}
              </td>
              <td className={styles.tdCode}>{row.code}</td>
              <td className={styles.td}>{row.wave}</td>
              {context === 'sets' && (
                <td className={styles.td}>{row.og_release_date ?? '—'}</td>
              )}
              {context === 'shop' && (
                <td
                  className={styles.td}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setReleaseRow(row); }}
                >
                  <span className={row.shop_active ? styles.statusActive : row.next_release_start ? styles.statusPlanned : styles.statusInactive}>
                    {row.shop_active ? t('admin.releaseActive') : row.next_release_start ? t('admin.releasePlannedLabel') : t('admin.inactive')}
                  </span>
                </td>
              )}
              <td className={styles.td}>{row.card_count}</td>
              {context === 'shop' && routeFilter === 'booster' && (
                <td className={styles.td}>
                  <input
                    type="number"
                    min={1}
                    className={styles.inlineNumber}
                    value={localPackSizes[row.name] ?? row.pack_size}
                    onChange={(e) => setLocalPackSizes((p) => ({ ...p, [row.name]: parseInt(e.target.value, 10) || 1 }))}
                    onBlur={() => handlePackSizeSave(row.name)}
                  />
                </td>
              )}
              {context === 'shop' && (routeFilter === 'booster' || routeFilter === 'starter') && (
                <td className={styles.td}>
                  <input
                    type="number"
                    min={0}
                    className={styles.inlineNumberFlat}
                    value={localPrices[row.name] ?? row.price_pack}
                    onChange={(e) => setLocalPrices((p) => ({ ...p, [row.name]: parseInt(e.target.value, 10) || 0 }))}
                    onBlur={() => handlePriceSave(row.name)}
                  />
                </td>
              )}
              {context === 'shop' && (
                <td
                  className={styles.td}
                  style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    if (!token) return;
                    await updateSetConfig(token, row.name, { shop_visible: !row.shop_visible });
                    await loadSets();
                  }}
                >
                  <span className={row.shop_visible ? styles.statusActive : styles.statusInactive}>
                    {row.shop_visible ? t('admin.shopVisible') : t('admin.shopHidden')}
                  </span>
                </td>
              )}
              <td className={styles.tdGear}>
                <button
                  className={styles.gearBtn}
                  onClick={(e) => { e.stopPropagation(); openModal(row); }}
                  title={t('admin.settings')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Settings Modal */}
      <SettingsModal
        open={modalRow !== null}
        title={modalRow?.name ?? ''}
        saving={saving}
        saveLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        deleteLabel={t('admin.deleteSet')}
        resultMsg={saveResult?.msg}
        resultOk={saveResult?.ok}
        onSave={handleSave}
        onClose={closeModal}
        onDelete={handleDeleteSet}
      >
        {/* Set Settings — Cards & Sets context */}
        {context === 'sets' && setForm && (
          <>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.wave')}</span>
              <input
                className={ms.fieldInput}
                type="number"
                min={0}
                value={setForm.wave}
                onChange={(e) => setSetForm((p) => p ? { ...p, wave: Number(e.target.value) } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.ogRelease')}</span>
              <input
                className={ms.fieldInput}
                type="date"
                value={setForm.releaseDate}
                onChange={(e) => setSetForm((p) => p ? { ...p, releaseDate: e.target.value } : p)}
              />
            </div>

            {/* Rarity Rates — only for boosters */}
            {routeFilter === 'booster' && <div style={{ marginTop: 8, borderTop: '1px solid var(--orichalcos-faint)', paddingTop: 14 }}>
              <span className={ms.fieldLabel} style={{ display: 'block', marginBottom: 8 }}>{t('admin.rarityRates')}</span>
              {ratesForm.map((rate, idx) => (
                <div key={idx} className={ms.fieldRow} style={{ marginBottom: 6 }}>
                  <span className={ms.fieldInput} style={{ flex: 2, opacity: 0.8 }}>{rate.rarity}</span>
                  <input className={ms.fieldInput} style={{ flex: 1 }} type="number" min={0} max={100} step={0.1} value={rate.ratePct}
                    onChange={(e) => setRatesForm((p) => p.map((r, i) => i === idx ? { ...r, ratePct: Number(e.target.value) } : r))} />
                  <button className={ms.cancelBtn} style={{ padding: '6px 10px' }}
                    onClick={() => setRatesForm((p) => p.filter((_, i) => i !== idx))}>x</button>
                </div>
              ))}
              {/* Add button — only show rarities not yet in the list */}
              {(() => {
                const used = new Set(ratesForm.map((r) => r.rarity));
                const missing = availableRarities.filter((r) => !used.has(r));
                if (missing.length === 0) return null;
                return (
                  <select
                    className={ms.fieldInput}
                    style={{ marginTop: 4, fontSize: '0.75rem' }}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setRatesForm((p) => [...p, { rarity: e.target.value, ratePct: 0 }]);
                    }}
                  >
                    <option value="">{t('admin.addRate')}</option>
                    {missing.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                );
              })()}
              {ratesForm.length > 0 && Math.abs(ratesSum - 100) > 0.01 && (
                <span className={ms.resultErr} style={{ display: 'block', marginTop: 6, fontSize: '0.5rem' }}>
                  {t('admin.rateSum', { sum: ratesSum.toFixed(1) })}
                </span>
              )}
            </div>}
          </>
        )}

        {/* Shop Config — Shop context */}
        {context === 'shop' && configForm && (
          <>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descDe')}</span>
              <textarea className={`${ms.fieldInput} ${ms.fieldTextarea}`} rows={3} value={configForm.descDe}
                onChange={(e) => setConfigForm((p) => p ? { ...p, descDe: e.target.value } : p)} />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descEn')}</span>
              <textarea className={`${ms.fieldInput} ${ms.fieldTextarea}`} rows={3} value={configForm.descEn}
                onChange={(e) => setConfigForm((p) => p ? { ...p, descEn: e.target.value } : p)} />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.sortOrder')}</span>
              <input className={ms.fieldInput} type="number" min={0} value={configForm.sortOrder}
                onChange={(e) => setConfigForm((p) => p ? { ...p, sortOrder: Number(e.target.value) } : p)} />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.igReleaseDate')}</span>
              <input className={ms.fieldInput} type="date" value={configForm.igReleaseDate}
                onChange={(e) => setConfigForm((p) => p ? { ...p, igReleaseDate: e.target.value } : p)} />
            </div>
          </>
        )}
      </SettingsModal>

      {/* Create Set Modal */}
      <SettingsModal
        open={createOpen}
        title={routeFilter === 'starter' ? t('admin.createStarter') : t('admin.createSet')}
        saving={creating}
        saveLabel={createResult?.ok ? t('admin.goToDetail') : (importStatus || (creating ? t('admin.creating') : (routeFilter === 'starter' ? t('admin.createStarter') : t('admin.createSet'))))}
        cancelLabel={t('common.cancel')}
        resultMsg={createResult?.msg}
        resultOk={createResult?.ok}
        onSave={createResult?.ok ? handlePostImportNavigate : handleCreateSet}
        onClose={creating ? () => undefined : handleCloseCreateModal}
      >
        {/* Tabs: API / Custom */}
        <div className={styles.tabRow}>
          <button
            className={`${styles.tab} ${createMode === 'api' ? styles.tabActive : ''}`}
            onClick={() => setCreateMode('api')}
          >{t('admin.createSetFromApi')}</button>
          <button
            className={`${styles.tab} ${createMode === 'custom' ? styles.tabActive : ''}`}
            onClick={() => setCreateMode('custom')}
          >{t('admin.createSetCustom')}</button>
        </div>

        {/* API Search */}
        {createMode === 'api' && (
          <>
            <input
              className={ms.fieldInput}
              type="text"
              placeholder={t('admin.searchApiSets')}
              value={apiSearch}
              onChange={(e) => handleApiSearchChange(e.target.value)}
            />
            {apiLoading && <span className={ms.fieldLabel}>{t('admin.loading')}</span>}
            {!apiLoading && apiDebouncedSearch.length >= 2 && apiResults.length === 0 && (
              <span className={ms.fieldLabel}>{t('admin.noApiResults')}</span>
            )}
            {apiResults.length > 0 && (
              <div className={styles.apiResultsList}>
                {apiResults.map((r) => (
                  <div
                    key={r.set_name}
                    className={`${styles.apiResultItem} ${r.already_exists ? styles.apiResultDisabled : ''} ${createForm.name === r.set_name ? styles.apiResultSelected : ''}`}
                    onClick={() => handleSelectApiSet(r)}
                  >
                    <span>{r.set_name}</span>
                    <span className={styles.apiResultCode}>{r.set_code}</span>
                    {r.already_exists ? (
                      <span className={styles.apiResultExists}>{t('admin.setAlreadyExists')}</span>
                    ) : (
                      <span className={styles.apiResultMeta}>
                        {r.num_of_cards} {t('admin.cards')} {r.tcg_date ? `| ${r.tcg_date}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Custom mode: Name + Code fields */}
        {createMode === 'custom' && (
          <>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.setName')}</span>
              <input className={ms.fieldInput} value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.setCode')}</span>
              <input className={ms.fieldInput} value={createForm.code}
                onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
          </>
        )}

        {/* API mode: show selected set name as read-only info */}
        {createMode === 'api' && createForm.name && (
          <div className={ms.fieldRow}>
            <span className={ms.fieldLabel}>{t('admin.setName')}</span>
            <span className={ms.fieldInput} style={{ opacity: 0.7 }}>{createForm.name} ({createForm.code})</span>
          </div>
        )}

        {/* Shared fields: Wave, Release, Status */}
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.wave')}</span>
          <input className={ms.fieldInput} type="number" min={0} value={createForm.wave}
            onChange={(e) => setCreateForm((p) => ({ ...p, wave: Number(e.target.value) }))} />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.ogRelease')}</span>
          <input className={ms.fieldInput} type="date" value={createForm.releaseDate}
            onChange={(e) => setCreateForm((p) => ({ ...p, releaseDate: e.target.value }))} />
        </div>
      </SettingsModal>

      {/* Delete Confirmation — Step 1: confirm delete */}
      <ConfirmModal
        open={deleteStep === 'confirm'}
        title={t('admin.deleteSet')}
        onClose={() => setDeleteStep(null)}
        actions={[
          { label: t('admin.confirmDelete'), variant: 'danger', onClick: handleShowDeleteCards },
          { label: t('common.cancel'), variant: 'muted', onClick: () => setDeleteStep(null) },
        ]}
      >
        <p>
          <strong>{modalRow?.name}</strong> {t('admin.deleteSetConfirmMsg')}
        </p>
      </ConfirmModal>

      {/* Delete Confirmation — Step 2: also delete cards? */}
      <ConfirmModal
        open={deleteStep === 'deleteCards'}
        title={t('admin.deleteCardsQuestion')}
        onClose={() => { setDeleteStep(null); setExclusiveCards([]); }}
        actions={[
          { label: t('admin.deleteCardsYes', { count: exclusiveCards.length }), variant: 'danger', onClick: () => executeDelete(true) },
          { label: t('admin.deleteCardsNo'), variant: 'primary', onClick: () => executeDelete(false) },
          { label: t('common.cancel'), variant: 'muted', onClick: () => { setDeleteStep(null); setExclusiveCards([]); } },
        ]}
      >
        <p>{t('admin.deleteCardsExplain')}</p>
        {exclusiveLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>...</p>}
        {!exclusiveLoading && exclusiveCards.length === 0 && (
          <p style={{ color: 'var(--orichalcos-light)', fontSize: '0.8rem', marginTop: 8 }}>
            {t('admin.noExclusiveCards')}
          </p>
        )}
        {!exclusiveLoading && exclusiveCards.length > 0 && (
          <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
              {t('admin.exclusiveCardsCount', { count: exclusiveCards.length })}
            </p>
            {exclusiveCards.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(0,220,168,0.05)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{c.name_de}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{c.frame_type}</span>
              </div>
            ))}
          </div>
        )}
      </ConfirmModal>

      {/* Release Modal */}
      {token && releaseRow && (
        <ReleaseModal
          open={releaseRow !== null}
          onClose={() => setReleaseRow(null)}
          productType={releaseRow.product_type ?? 'booster'}
          productId={releaseRow.name}
          productName={releaseRow.name}
          ogReleaseDate={releaseRow.og_release_date}
          igReleaseDate={releaseRow.ig_release_date}
          isEvent={releaseRow.is_event ?? false}
          active={releaseRow.shop_active}
          token={token}
          onChanged={() => loadSets()}
        />
      )}
    </div>
  );
}
