/**
 * ReleaseModal — manages release windows for products (boosters, starters, displays).
 * Shows OG/IG release dates, current status, release history, and a form to plan new releases.
 *
 * Normal products: activate via ig_release_date, reactivate after deactivation, no planned windows.
 * Event products: schedule windows with mandatory start + end dates, can recur.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchReleaseWindows,
  createReleaseWindow,
  deleteReleaseWindow,
  deactivateProduct,
  activateProduct,
  reactivateProduct,
} from '../../services/admin/releases';
import type { ReleaseWindow } from '../../services/admin/types';
import styles from './ReleaseModal.module.css';

interface ReleaseModalProps {
  open: boolean;
  onClose: () => void;
  productType: string;
  productId: string;
  productName: string;
  ogReleaseDate?: string | null;
  igReleaseDate?: string | null;
  isEvent: boolean;
  active: boolean;
  token: string;
  onChanged: () => void;
}

function formatDate(dateStr: string, isEn: boolean): string {
  try {
    return new Date(dateStr).toLocaleDateString(isEn ? 'en-US' : 'de-DE');
  } catch {
    return dateStr;
  }
}

function getWindowStatus(w: ReleaseWindow): 'active' | 'ended' | 'planned' {
  const today = new Date().toISOString().split('T')[0];
  const start = w.start_date.split('T')[0];
  const end = w.end_date ? w.end_date.split('T')[0] : null;
  if (start > today) return 'planned';
  if (end && end < today) return 'ended';
  return 'active';
}

export function ReleaseModal({
  open, onClose, productType, productId, productName,
  ogReleaseDate, igReleaseDate, isEvent, active, token, onChanged,
}: ReleaseModalProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [windows, setWindows] = useState<ReleaseWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [localActive, setLocalActive] = useState(active);

  const loadWindows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReleaseWindows(token, productType, productId);
      const sorted = [...data].sort((a, b) =>
        b.start_date.localeCompare(a.start_date)
      );
      setWindows(sorted);
    } catch {
      setWindows([]);
    } finally {
      setLoading(false);
    }
  }, [token, productType, productId]);

  useEffect(() => { setLocalActive(active); }, [active]);

  useEffect(() => {
    if (open) {
      setLocalActive(active);
      loadWindows();
      setShowPlanForm(false);
      setPlanStart('');
      setPlanEnd('');
    }
  }, [open, loadWindows]);

  // Normal product: set ig_release_date and activate
  const handleActivateNormal = useCallback(async () => {
    if (!planStart) return;
    setSaving(true);
    try {
      await activateProduct(token, productType, productId, planStart);
      await loadWindows();
      onChanged();
      setShowPlanForm(false);
      setPlanStart('');
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, planStart, loadWindows, onChanged]);

  // Normal product: reactivate after deactivation
  const handleReactivate = useCallback(async () => {
    setSaving(true);
    try {
      await reactivateProduct(token, productType, productId);
      setLocalActive(true);
      await loadWindows();
      onChanged();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, loadWindows, onChanged]);

  // Deactivate any product
  const handleDeactivate = useCallback(async () => {
    setSaving(true);
    try {
      await deactivateProduct(token, productType, productId);
      setLocalActive(false);
      await loadWindows();
      onChanged();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, loadWindows, onChanged]);

  // Event product: create window with start + end
  const handleCreateEventWindow = useCallback(async () => {
    if (!planStart || !planEnd) return;
    setSaving(true);
    try {
      await createReleaseWindow(token, {
        product_type: productType,
        product_id: productId,
        start_date: planStart,
        end_date: planEnd,
      });
      await loadWindows();
      onChanged();
      setShowPlanForm(false);
      setPlanStart('');
      setPlanEnd('');
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, planStart, planEnd, loadWindows, onChanged]);

  const handleDeleteWindow = useCallback(async (id: number) => {
    setSaving(true);
    try {
      await deleteReleaseWindow(token, id);
      await loadWindows();
      onChanged();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, loadWindows, onChanged]);

  if (!open) return null;

  const today = new Date().toISOString().split('T')[0];

  // Normal product states
  const hasBeenReleased = !!igReleaseDate;
  const isNormalUnreleased = !isEvent && !hasBeenReleased;
  const isNormalInactiveAfterRelease = !isEvent && hasBeenReleased && !localActive;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{productName}</h2>
          {isEvent && <span className={styles.eventBadge}>Event</span>}
          <button className={styles.close} onClick={onClose}>x</button>
        </div>

        <div className={styles.body}>
          {/* OG Release Date (read-only) */}
          {ogReleaseDate && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('admin.ogReleaseDate')}</span>
              <span className={styles.infoValue}>{formatDate(ogReleaseDate, isEn)}</span>
            </div>
          )}

          {/* IG Release Date (read-only) */}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t('admin.igReleaseDate')}</span>
            {igReleaseDate ? (
              <span className={styles.infoValue}>{formatDate(igReleaseDate, isEn)}</span>
            ) : (
              <span className={styles.infoValueMuted}>{t('admin.releaseNotSet')}</span>
            )}
          </div>

          {/* Current Status + Actions */}
          <div className={styles.statusRow}>
            <span className={styles.infoLabel}>{t('admin.status')}</span>
            <span className={localActive ? styles.badgeActive : styles.badgeInactive}>
              {localActive ? t('admin.releaseActive') : t('admin.inactive')}
            </span>

            {/* Active → click to set Inactive */}
            {localActive && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                disabled={saving}
                onClick={handleDeactivate}
              >
                {t('admin.inactive')}
              </button>
            )}

            {/* Inactive (has been released before) → click to set Active */}
            {isNormalInactiveAfterRelease && (
              <button
                className={styles.actionBtn}
                disabled={saving}
                onClick={handleReactivate}
              >
                {t('admin.releaseActive')}
              </button>
            )}
          </div>

          <div className={styles.divider} />

          {/* Release History (read-only for all products) */}
          <span className={styles.sectionTitle}>{t('admin.releaseHistory')}</span>

          {loading ? (
            <span className={styles.emptyHistory}>{t('admin.loading')}</span>
          ) : windows.length === 0 ? (
            <span className={styles.emptyHistory}>{t('admin.noReleaseHistory')}</span>
          ) : (
            <div className={styles.historyList}>
              {windows.map((w) => {
                const status = getWindowStatus(w);
                const startStr = formatDate(w.start_date, isEn);
                const endStr = w.end_date ? formatDate(w.end_date, isEn) : t('admin.releaseUnlimited');
                const isFuture = w.start_date.split('T')[0] > today;

                const badgeClass =
                  status === 'active' ? styles.historyBadgeActive
                  : status === 'ended' ? styles.historyBadgeEnded
                  : styles.historyBadgePlanned;

                const badgeLabel =
                  status === 'active' ? t('admin.releaseActive')
                  : status === 'ended' ? t('admin.releaseEnded')
                  : t('admin.releasePlanned', { date: startStr });

                return (
                  <div key={w.id} className={styles.historyItem}>
                    <span className={styles.historyDates}>
                      {startStr} — {endStr}
                    </span>
                    <span className={badgeClass}>
                      {badgeLabel}
                    </span>
                    {/* Only event products can delete future windows */}
                    {isEvent && isFuture && (
                      <button
                        className={styles.historyDeleteBtn}
                        onClick={() => handleDeleteWindow(w.id)}
                        title={t('admin.deleteReleaseWindow')}
                        disabled={saving}
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.divider} />

          {/* Normal product, unreleased: Plan Release (single date) */}
          {isNormalUnreleased && !showPlanForm && (
            <button className={styles.planToggle} onClick={() => setShowPlanForm(true)}>
              {t('admin.planReleaseDate')}
            </button>
          )}

          {isNormalUnreleased && showPlanForm && (
            <div className={styles.planForm}>
              <span className={styles.sectionTitle}>{t('admin.planReleaseDate')}</span>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{t('admin.releaseDate')}</span>
                <input
                  className={styles.fieldInput}
                  type="date"
                  value={planStart}
                  onChange={(e) => setPlanStart(e.target.value)}
                />
              </div>
              <button
                className={styles.saveBtn}
                disabled={saving || !planStart}
                onClick={handleActivateNormal}
              >
                {saving ? '...' : t('common.save')}
              </button>
            </div>
          )}

          {/* Event product: Plan New Window (start + end required) */}
          {isEvent && !showPlanForm && (
            <button className={styles.planToggle} onClick={() => setShowPlanForm(true)}>
              {t('admin.planNewWindow')}
            </button>
          )}

          {isEvent && showPlanForm && (
            <div className={styles.planForm}>
              <span className={styles.sectionTitle}>{t('admin.planNewWindow')}</span>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{t('admin.releaseStart')}</span>
                <input
                  className={styles.fieldInput}
                  type="date"
                  value={planStart}
                  onChange={(e) => setPlanStart(e.target.value)}
                />
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{t('admin.releaseEnd')}</span>
                <input
                  className={styles.fieldInput}
                  type="date"
                  value={planEnd}
                  onChange={(e) => setPlanEnd(e.target.value)}
                />
              </div>
              <button
                className={styles.saveBtn}
                disabled={saving || !planStart || !planEnd}
                onClick={handleCreateEventWindow}
              >
                {saving ? '...' : t('common.save')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
