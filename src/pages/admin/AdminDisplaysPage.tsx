/**
 * AdminDisplaysPage — table of display products with gear icon per row
 * that opens a SettingsModal for editing. Create/delete flows included.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ReleaseModal } from '../../components/admin/ReleaseModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import styles from './AdminDisplays.module.css';

// ============================================================
// Local form state types
// ============================================================

interface DisplayForm {
  name: string;
  price: number;
  descDe: string;
  descEn: string;
  wave: number;
  sortOrder: number;
  shopVisible: boolean;
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

  // Data
  const [displays, setDisplays] = useState<AdminDisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal state
  const [editRow, setEditRow] = useState<AdminDisplayRow | null>(null);
  const [editForm, setEditForm] = useState<DisplayForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<DisplayForm>({
    name: '', price: 0, descDe: '', descEn: '', wave: 0, sortOrder: 0, shopVisible: true,
  });
  const [createContents, setCreateContents] = useState<ContentEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Booster search state (for create modal)
  const [boosterSearch, setBoosterSearch] = useState('');
  const [boosterDebouncedSearch, setBoosterDebouncedSearch] = useState('');
  const [boosterResults, setBoosterResults] = useState<{ name: string; code: string }[]>([]);
  const boosterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release modal state
  const [releaseRow, setReleaseRow] = useState<AdminDisplayRow | null>(null);

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
    setCreateForm({ name: '', price: 0, descDe: '', descEn: '', wave: 0, sortOrder: 0, shopVisible: true });
    setCreateContents([]);
    setCreateResult(null);
    setBoosterSearch('');
    setBoosterDebouncedSearch('');
    setBoosterResults([]);
  };

  const handleAddBooster = (booster: { name: string; code: string }) => {
    // Avoid duplicates
    if (createContents.some((c) => c.boosterSetName === booster.name)) return;
    setCreateContents((prev) => [...prev, { boosterSetName: booster.name, packCount: 24 }]);
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
        price: createForm.price,
        desc_de: createForm.descDe || undefined,
        desc_en: createForm.descEn || undefined,
        wave: createForm.wave,
        sort_order: createForm.sortOrder,
        active: false,
        shop_visible: createForm.shopVisible,
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
        price: editForm.price,
        desc_de: editForm.descDe,
        desc_en: editForm.descEn,
        wave: editForm.wave,
        sort_order: editForm.sortOrder,
        shop_visible: editForm.shopVisible,
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
        <h1 className={styles.title}>{t('admin.manageDisplays')}</h1>
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
              <th className={styles.th}>{t('admin.displayPrice')}</th>
              <th className={styles.th}>{t('admin.displayTotalPacks')}</th>
              <th className={styles.th}>{t('admin.displayContentsCol')}</th>
              <th className={styles.th}>{t('admin.wave')}</th>
              <th className={styles.th}>{t('admin.release')}</th>
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {displays.map((row) => (
              <tr key={row.id} className={styles.tr}>
                <td className={styles.td}>{row.name}</td>
                <td className={styles.td}>{row.price} DP</td>
                <td className={styles.td}>{row.total_packs}</td>
                <td className={styles.td}>
                  {row.contents.length} Booster
                </td>
                <td className={styles.td}>{row.wave}</td>
                <td
                  className={styles.td}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setReleaseRow(row); }}
                >
                  {row.active && !row.active_window_end && (
                    <span className={styles.statusActive}>{t('admin.releaseActive')}</span>
                  )}
                  {row.active && row.active_window_end && (
                    <span className={styles.statusActive}>
                      {t('admin.releaseActiveUntil', {
                        date: row.active_window_end.split('T')[0].split('-').reverse().join('.'),
                      })}
                    </span>
                  )}
                  {!row.active && row.next_release_start && (
                    <span style={{ color: 'var(--gold)' }}>
                      {t('admin.releasePlanned', {
                        date: row.next_release_start.split('T')[0].split('-').reverse().join('.'),
                      })}
                    </span>
                  )}
                  {!row.active && !row.next_release_start && (
                    <span style={{ color: 'var(--text-muted)' }}>{t('admin.releaseNotPlanned')}</span>
                  )}
                </td>
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
              <span className={ms.fieldLabel}>{t('admin.displayPrice')}</span>
              <input
                className={ms.fieldInput}
                type="number"
                min={0}
                value={editForm.price}
                onChange={(e) => setEditForm((p) => p ? { ...p, price: Number(e.target.value) } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descDe')}</span>
              <textarea
                className={`${ms.fieldInput} ${ms.fieldTextarea}`}
                rows={3}
                value={editForm.descDe}
                onChange={(e) => setEditForm((p) => p ? { ...p, descDe: e.target.value } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.descEn')}</span>
              <textarea
                className={`${ms.fieldInput} ${ms.fieldTextarea}`}
                rows={3}
                value={editForm.descEn}
                onChange={(e) => setEditForm((p) => p ? { ...p, descEn: e.target.value } : p)}
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
              <span className={ms.fieldLabel}>{t('admin.sortOrder')}</span>
              <input
                className={ms.fieldInput}
                type="number"
                min={0}
                value={editForm.sortOrder}
                onChange={(e) => setEditForm((p) => p ? { ...p, sortOrder: Number(e.target.value) } : p)}
              />
            </div>
            <div className={ms.fieldRow}>
              <span className={ms.fieldLabel}>{t('admin.shopVisibility')}</span>
              <div className={ms.statusRow}>
                <button
                  className={`${ms.statusBtn} ${editForm.shopVisible ? ms.statusBtnActive : ''}`}
                  onClick={() => setEditForm((p) => p ? { ...p, shopVisible: true } : p)}
                >{t('admin.shopVisible')}</button>
                <button
                  className={`${ms.statusBtn} ${!editForm.shopVisible ? ms.statusBtnInactive : ''}`}
                  onClick={() => setEditForm((p) => p ? { ...p, shopVisible: false } : p)}
                >{t('admin.shopHidden')}</button>
              </div>
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
          <span className={ms.fieldLabel}>{t('admin.displayPrice')}</span>
          <input
            className={ms.fieldInput}
            type="number"
            min={0}
            value={createForm.price}
            onChange={(e) => setCreateForm((p) => ({ ...p, price: Number(e.target.value) }))}
          />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.descDe')}</span>
          <textarea
            className={`${ms.fieldInput} ${ms.fieldTextarea}`}
            rows={2}
            value={createForm.descDe}
            onChange={(e) => setCreateForm((p) => ({ ...p, descDe: e.target.value }))}
          />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.descEn')}</span>
          <textarea
            className={`${ms.fieldInput} ${ms.fieldTextarea}`}
            rows={2}
            value={createForm.descEn}
            onChange={(e) => setCreateForm((p) => ({ ...p, descEn: e.target.value }))}
          />
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
          <span className={ms.fieldLabel}>{t('admin.sortOrder')}</span>
          <input
            className={ms.fieldInput}
            type="number"
            min={0}
            value={createForm.sortOrder}
            onChange={(e) => setCreateForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
          />
        </div>
        <div className={ms.fieldRow}>
          <span className={ms.fieldLabel}>{t('admin.shopVisibility')}</span>
          <div className={ms.statusRow}>
            <button
              className={`${ms.statusBtn} ${createForm.shopVisible ? ms.statusBtnActive : ''}`}
              onClick={() => setCreateForm((p) => ({ ...p, shopVisible: true }))}
            >{t('admin.shopVisible')}</button>
            <button
              className={`${ms.statusBtn} ${!createForm.shopVisible ? ms.statusBtnInactive : ''}`}
              onClick={() => setCreateForm((p) => ({ ...p, shopVisible: false }))}
            >{t('admin.shopHidden')}</button>
          </div>
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

      {/* Release Modal */}
      {token && releaseRow && (
        <ReleaseModal
          open={releaseRow !== null}
          onClose={() => setReleaseRow(null)}
          productType="display"
          productId={String(releaseRow.id)}
          productName={releaseRow.name}
          igReleaseDate={releaseRow.ig_release_date}
          active={releaseRow.active}
          token={token}
          onChanged={() => loadDisplays()}
        />
      )}
    </div>
  );
}
