/**
 * AdminDisplaysPage — table of display products with gear icon per row
 * that opens a SettingsModal for editing. Create/delete flows included.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import {
  fetchAdminDisplays,
  createDisplay,
  updateDisplay,
  deleteDisplay,
  searchBoosters,
  type AdminDisplayRow,
} from '../../services/admin';
import { SettingsModal, settingsModalStyles as ms } from '../../components/admin/SettingsModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import styles from './AdminDisplays.module.css';

// ============================================================
// Local form state types
// ============================================================

interface DisplayForm {
  name: string;
  codeSuffix: string;
  price: number;
  descDe: string;
  descEn: string;
  wave: number;
  sortOrder: number;
  shopVisible: boolean;
  ogReleaseDate: string;
}

interface ContentEntry {
  boosterSetName: string;
  packCount: number;
}

// ============================================================
// AdminDisplaysPage
// ============================================================

export function AdminDisplaysPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Data
  const [displays, setDisplays] = useState<AdminDisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Card breakdown modal
  const [cardBreakdownRow, setCardBreakdownRow] = useState<AdminDisplayRow | null>(null);

  // Edit modal state
  const [editRow, setEditRow] = useState<AdminDisplayRow | null>(null);
  const [editForm, setEditForm] = useState<DisplayForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<DisplayForm>({
    name: '', codeSuffix: '', price: 0, descDe: '', descEn: '', wave: 0, sortOrder: 0, shopVisible: true,
  });
  const [createContents, setCreateContents] = useState<ContentEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Booster search state (for create modal)
  const [boosterSearch, setBoosterSearch] = useState('');
  const [boosterDebouncedSearch, setBoosterDebouncedSearch] = useState('');
  const [boosterResults, setBoosterResults] = useState<{ name: string; code: string; og_release_date?: string }[]>([]);
  const boosterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirm state
  const [deleteRow, setDeleteRow] = useState<AdminDisplayRow | null>(null);

  // ---- Load displays ----
  const loadDisplays = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchAdminDisplays(token);
      setDisplays(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { loadDisplays(); }, [loadDisplays]);

  // ---- Booster search debounce ----
  const handleBoosterSearchChange = useCallback((value: string) => {
    setBoosterSearch(value);
    if (boosterDebounceRef.current) clearTimeout(boosterDebounceRef.current);
    boosterDebounceRef.current = setTimeout(() => setBoosterDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => { if (boosterDebounceRef.current) clearTimeout(boosterDebounceRef.current); };
  }, []);

  useEffect(() => {
    if (!token || boosterDebouncedSearch.length < 1) { setBoosterResults([]); return; }
    let cancelled = false;
    searchBoosters(token, boosterDebouncedSearch)
      .then((results) => { if (!cancelled) setBoosterResults(results); })
      .catch(() => { if (!cancelled) setBoosterResults([]); });
    return () => { cancelled = true; };
  }, [token, boosterDebouncedSearch]);

  // ---- Create flow ----
  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateForm({ name: '', codeSuffix: '', price: 0, descDe: '', descEn: '', wave: 0, sortOrder: 0, shopVisible: true, ogReleaseDate: '' });
    setCreateContents([]);
    setCreateResult(null);
    setBoosterSearch('');
    setBoosterDebouncedSearch('');
    setBoosterResults([]);
  };

  const handleAddBooster = (booster: { name: string; code: string; og_release_date?: string }) => {
    // Avoid duplicates
    if (createContents.some((c) => c.boosterSetName === booster.name)) return;
    setCreateContents((prev) => [...prev, { boosterSetName: booster.name, packCount: 24 }]);
    // Auto-fill name, code + OG release from each added booster
    setCreateForm((p) => ({
      ...p,
      name: `${booster.code ?? booster.name} Display`,
      codeSuffix: booster.code ?? p.codeSuffix,
      ogReleaseDate: booster.og_release_date ?? p.ogReleaseDate,
    }));
    setBoosterSearch('');
    setBoosterDebouncedSearch('');
    setBoosterResults([]);
  };

  const handleRemoveContent = (index: number) => {
    setCreateContents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContentPackCount = (index: number, value: number) => {
    setCreateContents((prev) =>
      prev.map((c, i) => i === index ? { ...c, packCount: value } : c),
    );
  };

  const handleCreateDisplay = useCallback(async () => {
    if (!token || !createForm.name) {
      setCreateResult({ ok: false, msg: t('admin.requiredFields') });
      return;
    }
    setCreating(true);
    setCreateResult(null);
    try {
      await createDisplay(token, {
        name: createForm.name,
        code: createForm.codeSuffix ? `DSP-${createForm.codeSuffix.toUpperCase()}` : undefined,
        price: createForm.price,
        desc_de: createForm.descDe || undefined,
        desc_en: createForm.descEn || undefined,
        wave: createForm.wave,
        sort_order: createForm.sortOrder,
        shop_active: false,
        shop_visible: createForm.shopVisible,
        og_release_date: createForm.ogReleaseDate || undefined,
        contents: createContents,
      });
      setCreateOpen(false);
      await loadDisplays();
    } catch (err) {
      setCreateResult({ ok: false, msg: err instanceof Error ? err.message : t('admin.createFailed') });
    } finally {
      setCreating(false);
    }
  }, [token, createForm, createContents, loadDisplays, t]);

  const handleCloseCreateModal = useCallback(() => {
    if (creating) return;
    setCreateOpen(false);
    setCreateResult(null);
  }, [creating]);

  // ---- Edit flow ----
  const openEditModal = (row: AdminDisplayRow) => {
    setSaveResult(null);
    setEditRow(row);
    setEditForm({
      name: row.name,
      price: row.price,
      descDe: row.desc_de ?? '',
      descEn: row.desc_en ?? '',
      wave: row.wave,
      sortOrder: row.sort_order,
      shopVisible: row.shop_visible,
      ogReleaseDate: row.og_release_date ?? '',
    });
  };

  const closeEditModal = () => {
    setEditRow(null);
    setSaveResult(null);
  };

  const handleSave = useCallback(async () => {
    if (!token || !editRow || !editForm) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await updateDisplay(token, editRow.id, {
        name: editForm.name,
        wave: editForm.wave,
        og_release_date: editForm.ogReleaseDate || null,
        desc_de: editForm.descDe,
        desc_en: editForm.descEn,
      });
      setSaveResult({ ok: true, msg: t('admin.saved') });
      await loadDisplays();
    } catch (err) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : t('admin.unknownError') });
    } finally {
      setSaving(false);
    }
  }, [token, editRow, editForm, loadDisplays, t]);

  // ---- Delete flow ----
  const handleDeleteClick = () => {
    if (!editRow) return;
    setDeleteRow(editRow);
  };

  const executeDelete = useCallback(async () => {
    if (!token || !deleteRow) return;
    setDeleteRow(null);
    setSaving(true);
    setSaveResult(null);
    try {
      await deleteDisplay(token, deleteRow.id);
      closeEditModal();
      await loadDisplays();
    } catch (err) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : t('admin.deleteFailed') });
    } finally {
      setSaving(false);
    }
  }, [token, deleteRow, loadDisplays, t]);

  // ---- Render ----
  if (loading) return <div className={styles.page}><p className={styles.loading}>{t('admin.loading')}</p></div>;
  if (error) return <div className={styles.page}><p className={styles.error}>{error}</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t('admin.displays')}</h1>
        <button className={styles.createBtn} onClick={openCreateModal}>
          {t('admin.createDisplay')}
        </button>
      </div>

      {displays.length === 0 ? (
        <p className={styles.loading}>{t('admin.noDisplays')}</p>
      ) : (
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.th}>{t('admin.name')}</th>
              <th className={styles.th}>{t('admin.code')}</th>
              <th className={styles.th}>{t('admin.wave')}</th>
              <th className={styles.th}>{t('admin.ogRelease')}</th>
              <th className={styles.th}>{t('admin.displayContentsCol')}</th>
              <th className={styles.th}>{t('admin.displayTotalPacks')}</th>
              <th className={styles.th}>{t('admin.cards')}</th>
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {displays.map((row) => (
              <tr key={row.id} className={styles.tr}>
                <td
                  className={styles.td}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }}
                  onClick={() => navigate(`/app/admin/sets/display/${encodeURIComponent(row.name)}`)}
                >
                  {row.name}
                </td>
                <td className={styles.td}>{row.code ?? '—'}</td>
                <td className={styles.td}>{row.wave}</td>
                <td className={styles.td}>{row.og_release_date ?? '—'}</td>
                <td className={styles.td} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }} onClick={() => setCardBreakdownRow(row)}>{row.contents.length} Booster</td>
                <td className={styles.td} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }} onClick={() => setCardBreakdownRow(row)}>{row.total_packs} Booster</td>
                <td className={styles.td} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }} onClick={() => setCardBreakdownRow(row)}>{row.card_count}</td>
                <td className={styles.tdGear}>
                  <button
                    className={styles.gearBtn}
                    onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
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
      )}

      {/* Edit Modal */}
      <SettingsModal
        open={editRow !== null}
        title={editRow?.name ?? ''}
        saving={saving}
        saveLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        deleteLabel={t('admin.deleteDisplay')}
        resultMsg={saveResult?.msg}
        resultOk={saveResult?.ok}
        onSave={handleSave}
        onClose={closeEditModal}
        onDelete={handleDeleteClick}
      >
        {editForm && (
          <>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.displayName')}</span>
              <input
                className={ms.fieldInput}
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => p ? { ...p, name: e.target.value } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.wave')}</span>
              <input
                className={ms.fieldInput}
                type="number"
                min={0}
                value={editForm.wave}
                onChange={(e) => setEditForm((p) => p ? { ...p, wave: Number(e.target.value) } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.ogRelease')}</span>
              <input
                className={ms.fieldInput}
                type="date"
                value={editForm.ogReleaseDate}
                onChange={(e) => setEditForm((p) => p ? { ...p, ogReleaseDate: e.target.value } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descDe')}</span>
              <textarea className={`${ms.fieldInput} ${ms.fieldTextarea}`} rows={3} value={editForm.descDe}
                onChange={(e) => setEditForm((p) => p ? { ...p, descDe: e.target.value } : p)} />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descEn')}</span>
              <textarea className={`${ms.fieldInput} ${ms.fieldTextarea}`} rows={3} value={editForm.descEn}
                onChange={(e) => setEditForm((p) => p ? { ...p, descEn: e.target.value } : p)} />
            </div>
          </>
        )}
      </SettingsModal>

      {/* Create Modal */}
      <SettingsModal
        open={createOpen}
        title={t('admin.createDisplay')}
        saving={creating}
        saveLabel={creating ? t('admin.creating') : t('admin.createDisplay')}
        cancelLabel={t('common.cancel')}
        resultMsg={createResult?.msg}
        resultOk={createResult?.ok}
        onSave={handleCreateDisplay}
        onClose={creating ? () => undefined : handleCloseCreateModal}
      >
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.displayName')}</span>
          <input
            className={ms.fieldInput}
            type="text"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.code')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>DSP-</span>
            <input
              className={ms.fieldInput}
              type="text"
              style={{ width: '100px', textTransform: 'uppercase' }}
              value={createForm.codeSuffix}
              onChange={(e) => setCreateForm((p) => ({ ...p, codeSuffix: e.target.value.toUpperCase() }))}
              placeholder="LOB"
            />
          </div>
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.wave')}</span>
          <input
            className={ms.fieldInput}
            type="number"
            min={0}
            value={createForm.wave}
            onChange={(e) => setCreateForm((p) => ({ ...p, wave: Number(e.target.value) }))}
          />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.ogRelease')}</span>
          <input
            className={ms.fieldInput}
            type="date"
            value={createForm.ogReleaseDate}
            onChange={(e) => setCreateForm((p) => ({ ...p, ogReleaseDate: e.target.value }))}
          />
        </div>

        {/* Booster contents editor */}
        <div style={{ marginTop: 8, borderTop: '1px solid var(--orichalcos-faint)', paddingTop: 14 }}>
          <span className={ms.fieldLabel} style={{ display: 'block', marginBottom: 8 }}>
            {t('admin.displayContents')}
          </span>

          <input
            className={styles.searchInput}
            type="text"
            placeholder={t('admin.searchBooster')}
            value={boosterSearch}
            onChange={(e) => handleBoosterSearchChange(e.target.value)}
          />

          {boosterResults.length > 0 && (
            <div className={styles.searchResults}>
              {boosterResults.map((b) => (
                <div
                  key={b.name}
                  className={styles.searchResultItem}
                  onClick={() => handleAddBooster(b)}
                >
                  <span>{b.name}</span>
                  <span className={styles.searchResultCode}>{b.code}</span>
                </div>
              ))}
            </div>
          )}

          {createContents.length === 0 ? (
            <p className={styles.noContent}>{t('admin.noDisplays')}</p>
          ) : (
            <div className={styles.contentsList}>
              {createContents.map((entry, idx) => (
                <div key={entry.boosterSetName} className={styles.contentItem}>
                  <span className={styles.contentItemName}>{entry.boosterSetName}</span>
                  <input
                    className={styles.contentItemInput}
                    type="number"
                    min={1}
                    value={entry.packCount}
                    onChange={(e) => handleContentPackCount(idx, Number(e.target.value))}
                    title={t('admin.packCount')}
                  />
                  <button
                    className={styles.contentRemove}
                    onClick={() => handleRemoveContent(idx)}
                  >x</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsModal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteRow !== null}
        title={t('admin.deleteDisplay')}
        onClose={() => setDeleteRow(null)}
        actions={[
          { label: t('admin.confirmDelete'), variant: 'danger', onClick: executeDelete },
          { label: t('common.cancel'), variant: 'muted', onClick: () => setDeleteRow(null) },
        ]}
      >
        <p>
          <strong>{deleteRow?.name}</strong> — {t('admin.deleteDisplayConfirm')}
        </p>
      </ConfirmModal>

      {/* Breakdown Modal (Style A) */}
      {cardBreakdownRow && (
        <div className={styles.modalOverlay} onClick={() => setCardBreakdownRow(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{cardBreakdownRow.name}</h3>
              <button className={styles.modalClose} onClick={() => setCardBreakdownRow(null)}>x</button>
            </div>
            <table className={styles.table} style={{ marginTop: '12px' }}>
              <thead>
                <tr>
                  <td className={styles.summaryCell}>
                    <span className={styles.summaryValue}>{cardBreakdownRow.contents.length}</span>
                    <span className={styles.summaryLabel}>Booster Sets</span>
                  </td>
                  <td className={styles.summaryCell}>
                    <span className={styles.summaryValue}>{cardBreakdownRow.total_packs}</span>
                    <span className={styles.summaryLabel}>{t('admin.displayTotalPacks')}</span>
                  </td>
                  <td className={styles.summaryCell}>
                    <span className={styles.summaryValue}>{cardBreakdownRow.card_count}</span>
                    <span className={styles.summaryLabel}>{t('common.total')} {t('admin.cards')}</span>
                  </td>
                </tr>
              </thead>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.th}>{t('admin.boosterName')}</th>
                  <th className={styles.th}>Packs</th>
                  <th className={styles.th}>{t('admin.cards')}</th>
                </tr>
              </thead>
              <tbody>
                {cardBreakdownRow.contents.map((c) => (
                  <tr key={c.boosterSetName} className={styles.tr}>
                    <td className={styles.td}>{c.boosterSetName}</td>
                    <td className={styles.td}>{c.packCount}</td>
                    <td className={styles.td}>{c.cardCount ?? 0}</td>
                  </tr>
                ))}
                <tr className={styles.tr} style={{ borderTop: '1px solid rgba(0, 220, 168, 0.12)' }}>
                  <td className={styles.td} style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: '0.7rem', letterSpacing: '1px', color: 'var(--orichalcos-light)' }}>{t('common.total')}</td>
                  <td className={styles.td} style={{ fontWeight: 700, color: 'var(--orichalcos-light)' }}>{cardBreakdownRow.total_packs}</td>
                  <td className={styles.td} style={{ fontWeight: 700, color: 'var(--orichalcos-light)' }}>{cardBreakdownRow.card_count}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
