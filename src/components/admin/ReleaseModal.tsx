/**
 * ReleaseModal — manages release windows for products (boosters, starters, displays).
 * Shows OG/IG release dates, current status, release history, and a form to plan new releases.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchReleaseWindows,
  createReleaseWindow,
  deleteReleaseWindow,
  deactivateProduct,
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
  ogReleaseDate, igReleaseDate, active, token, onChanged,
}: ReleaseModalProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [windows, setWindows] = useState<ReleaseWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planStart, setPlanStart] = useState('');
  const [planEnd, setPlanEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWindows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReleaseWindows(token, productType, productId);
      // Sort newest first
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

  useEffect(() => {
    if (open) {
      loadWindows();
      setShowPlanForm(false);
      setPlanStart('');
      setPlanEnd('');
    }
  }, [open, loadWindows]);

  const handleDeactivate = useCallback(async () => {
    setSaving(true);
    try {
      await deactivateProduct(token, productType, productId);
      await loadWindows();
      onChanged();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, loadWindows, onChanged]);

  const handleActivate = useCallback(async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await createReleaseWindow(token, {
        product_type: productType,
        product_id: productId,
        start_date: today,
      });
      await loadWindows();
      onChanged();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [token, productType, productId, loadWindows, onChanged]);

  const handleCreateWindow = useCallback(async () => {
    if (!planStart) return;
    setSaving(true);
    try {
      await createReleaseWindow(token, {
        product_type: productType,
        product_id: productId,
        start_date: planStart,
        end_date: planEnd || undefined,
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{productName}</h2>
          <button className={styles.close} onClick={onClose}>x</button>
        </div>

        <div className={styles.body}>
          {/* OG Release Date (read-only, only if provided) */}
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

          {/* Current Status */}
          <div className={styles.statusRow}>
            <span className={styles.infoLabel}>{t('admin.status')}</span>
            <span className={active ? styles.badgeActive : styles.badgeInactive}>
              {active ? t('admin.releaseActive') : t('admin.inactive')}
            </span>
            {active ? (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                disabled={saving}
                onClick={handleDeactivate}
              >
                {t('admin.deactivateNow')}
              </button>
            ) : (
              <button
                className={styles.actionBtn}
                disabled={saving}
                onClick={handleActivate}
              >
                {t('admin.activateNow')}
              </button>
            )}
          </div>

          <div className={styles.divider} />

          {/* Release History */}
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
                    {isFuture && (
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

          {/* Plan New Release */}
          {!showPlanForm ? (
            <button className={styles.planToggle} onClick={() => setShowPlanForm(true)}>
              {t('admin.planRelease')}
            </button>
          ) : (
            <div className={styles.planForm}>
              <span className={styles.sectionTitle}>{t('admin.planRelease')}</span>
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
                disabled={saving || !planStart}
                onClick={handleCreateWindow}
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
