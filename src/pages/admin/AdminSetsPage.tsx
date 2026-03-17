/**
 * AdminSetsPage — table of all card sets with inline active toggles
 * and expandable detail panels for editing set fields, shop config,
 * and rarity rates.
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import {
  fetchAdminSets,
  fetchSetRates,
  updateSet,
  updateSetConfig,
  updateSetRates,
  type AdminSetRow,
  type RarityRate,
} from '../../services/adminApi';
import styles from './AdminSets.module.css';

// ============================================================
// Local form state types (camelCase for convenience)
// ============================================================

interface SetForm {
  active: boolean;
  wave: number;
  releaseDate: string;
}

interface ConfigForm {
  pricePack: number;
  priceDisplay: number | null;
  packSize: number;
  displaySize: number | null;
  descDe: string;
  descEn: string;
  featured: boolean;
  sortOrder: number;
}

interface SaveResult {
  ok: boolean;
  msg: string;
}

// ============================================================
// ToggleSwitch
// ============================================================

function ToggleSwitch({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: () => void;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={onChange}
      aria-label={checked ? (labelOn ?? 'Deactivate') : (labelOff ?? 'Activate')}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

// ============================================================
// AdminSetsPage
// ============================================================

export function AdminSetsPage() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine filter based on route
  const routeFilter = location.pathname.endsWith('/booster')
    ? 'booster'
    : location.pathname.endsWith('/starter')
      ? 'starter'
      : null;

  const pageTitle = routeFilter === 'booster'
    ? t('admin.boosterPacks')
    : routeFilter === 'starter'
      ? t('admin.starterDecks')
      : t('admin.manageSetsTitle');

  // Data
  const [sets, setSets] = useState<AdminSetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Detail panel
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [setForm, setSetForm] = useState<SetForm | null>(null);
  const [configForm, setConfigForm] = useState<ConfigForm | null>(null);
  const [ratesForm, setRatesForm] = useState<RarityRate[]>([]);

  // Save
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  // ----------------------------------------------------------
  // Load sets
  // ----------------------------------------------------------

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

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  // ----------------------------------------------------------
  // Inline active toggle (optimistic)
  // ----------------------------------------------------------

  const handleToggleActive = useCallback(
    async (e: React.MouseEvent, row: AdminSetRow) => {
      e.stopPropagation();
      if (!token) return;

      const prev = row.active;
      const next = !prev;

      // Optimistic update
      setSets((current) =>
        current.map((s) => (s.name === row.name ? { ...s, active: next } : s)),
      );

      try {
        await updateSet(token, row.name, { active: next } as never);
      } catch {
        // Revert on failure
        setSets((current) =>
          current.map((s) =>
            s.name === row.name ? { ...s, active: prev } : s,
          ),
        );
      }
    },
    [token],
  );

  // ----------------------------------------------------------
  // Row click — expand / collapse detail panel
  // ----------------------------------------------------------

  const handleRowClick = useCallback(
    async (row: AdminSetRow) => {
      setSaveResult(null);

      if (selectedSet === row.name) {
        setSelectedSet(null);
        return;
      }

      setSelectedSet(row.name);
      setDetailLoading(true);

      // Populate set form
      setSetForm({
        active: row.active,
        wave: row.wave,
        releaseDate: row.release_date ?? '',
      });

      // Populate config form
      setConfigForm({
        pricePack: row.price_pack,
        priceDisplay: row.price_display,
        packSize: row.pack_size,
        displaySize: row.display_size,
        descDe: row.desc_de,
        descEn: row.desc_en,
        featured: row.featured,
        sortOrder: row.sort_order,
      });

      // Fetch rarity rates
      if (token) {
        try {
          const rates = await fetchSetRates(token, row.name);
          setRatesForm(rates);
        } catch {
          setRatesForm([]);
        }
      }

      setDetailLoading(false);
    },
    [selectedSet, token],
  );

  // ----------------------------------------------------------
  // Rarity rates helpers
  // ----------------------------------------------------------

  const ratesSum = ratesForm.reduce((sum, r) => sum + Number(r.ratePct), 0);

  const handleAddRate = () => {
    setRatesForm((prev) => [...prev, { rarity: '', ratePct: 0 }]);
  };

  const handleRemoveRate = (index: number) => {
    setRatesForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRateChange = (
    index: number,
    field: keyof RarityRate,
    value: string | number,
  ) => {
    setRatesForm((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  // ----------------------------------------------------------
  // Save all
  // ----------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!token || !selectedSet || !setForm || !configForm) return;

    setSaving(true);
    setSaveResult(null);

    const results = await Promise.allSettled([
      updateSet(token, selectedSet, {
        active: setForm.active,
        wave: setForm.wave,
        release_date: setForm.releaseDate || undefined,
      } as never),
      updateSetConfig(token, selectedSet, {
        price_pack: configForm.pricePack,
        price_display: configForm.priceDisplay,
        pack_size: configForm.packSize,
        display_size: configForm.displaySize,
        desc_de: configForm.descDe,
        desc_en: configForm.descEn,
        featured: configForm.featured,
        sort_order: configForm.sortOrder,
      }),
      updateSetRates(token, selectedSet, ratesForm),
    ]);

    const failed = results.filter((r) => r.status === 'rejected');

    if (failed.length === 0) {
      setSaveResult({ ok: true, msg: t('admin.saved') });
      await loadSets();
    } else {
      const reason =
        failed[0].status === 'rejected'
          ? (failed[0].reason as Error).message
          : t('admin.unknownError');
      setSaveResult({ ok: false, msg: reason });
    }

    setSaving(false);
  }, [token, selectedSet, setForm, configForm, ratesForm, loadSets, t]);

  // ----------------------------------------------------------
  // Cancel
  // ----------------------------------------------------------

  const handleCancel = () => {
    setSelectedSet(null);
    setSaveResult(null);
  };

  // ----------------------------------------------------------
  // Badge helper
  // ----------------------------------------------------------

  const typeBadge = (type: string | null) => {
    if (!type) return <span className={`${styles.badge} ${styles.badgeBooster}`}>—</span>;
    const lower = type.toLowerCase();
    if (lower.includes('starter') || lower.includes('deck')) {
      return <span className={`${styles.badge} ${styles.badgeStarter}`}>{type}</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeBooster}`}>{type}</span>;
  };

  // Filtered sets based on route
  const filteredSets = useMemo(() => {
    if (!routeFilter) return sets;
    return sets.filter((s) => s.product_type === routeFilter);
  }, [sets, routeFilter]);

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

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
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{pageTitle}</h1>

      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.th}>{t('admin.name')}</th>
            <th className={styles.th}>{t('admin.code')}</th>
            <th className={styles.th}>{t('admin.wave')}</th>
            {!routeFilter && <th className={styles.th}>{t('admin.type')}</th>}
            <th className={styles.th}>{t('admin.active')}</th>
            <th className={styles.th}>{t('admin.cards')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredSets.map((row) => (
            <Fragment key={row.name}>
              <tr
                className={`${styles.tr} ${selectedSet === row.name ? styles.trSelected : ''}`}
                onClick={() => handleRowClick(row)}
              >
                <td
                  className={styles.td}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--orichalcos-faint)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/admin/sets/${encodeURIComponent(row.name)}`);
                  }}
                >
                  {row.name}
                </td>
                <td className={styles.tdCode}>{row.code}</td>
                <td className={styles.td}>{row.wave}</td>
                {!routeFilter && <td className={styles.td}>{typeBadge(row.product_type)}</td>}
                <td
                  className={styles.td}
                  onClick={(e) => handleToggleActive(e, row)}
                >
                  <ToggleSwitch
                    checked={row.active}
                    onChange={() => {}}
                    labelOn={t('admin.deactivate')}
                    labelOff={t('admin.activate')}
                  />
                </td>
                <td className={styles.td}>{row.card_count}</td>
              </tr>

              {selectedSet === row.name && (
                <tr className={styles.detailRow}>
                  <td className={styles.detailCell} colSpan={routeFilter ? 5 : 6}>
                    {detailLoading ? (
                      <p className={styles.loading}>{t('admin.loading')}</p>
                    ) : (
                      <>
                        <div className={styles.detailGrid}>
                          {/* Left column: Set Fields + Shop Config */}
                          <div>
                            <div className={styles.detailSection}>
                              <h3 className={styles.detailSectionTitle}>
                                {t('admin.setSettings')}
                              </h3>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.active')}</span>
                                <ToggleSwitch
                                  checked={setForm?.active ?? false}
                                  onChange={() =>
                                    setSetForm((prev) =>
                                      prev ? { ...prev, active: !prev.active } : prev,
                                    )
                                  }
                                  labelOn={t('admin.deactivate')}
                                  labelOff={t('admin.activate')}
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.wave')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={0}
                                  value={setForm?.wave ?? 0}
                                  onChange={(e) =>
                                    setSetForm((prev) =>
                                      prev
                                        ? { ...prev, wave: Number(e.target.value) }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.release')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="date"
                                  value={setForm?.releaseDate ?? ''}
                                  onChange={(e) =>
                                    setSetForm((prev) =>
                                      prev
                                        ? { ...prev, releaseDate: e.target.value }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className={styles.detailSection} style={{ marginTop: 20 }}>
                              <h3 className={styles.detailSectionTitle}>
                                {t('admin.shopConfig')}
                              </h3>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.packPrice')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={0}
                                  value={configForm?.pricePack ?? 0}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, pricePack: Number(e.target.value) }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.displayPrice')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={0}
                                  value={configForm?.priceDisplay ?? ''}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            priceDisplay: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.packSize')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={1}
                                  value={configForm?.packSize ?? 0}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, packSize: Number(e.target.value) }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.displaySize')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={0}
                                  value={configForm?.displaySize ?? ''}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            displaySize: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.descDe')}</span>
                                <textarea
                                  className={styles.fieldTextarea}
                                  value={configForm?.descDe ?? ''}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, descDe: e.target.value }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.descEn')}</span>
                                <textarea
                                  className={styles.fieldTextarea}
                                  value={configForm?.descEn ?? ''}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, descEn: e.target.value }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.featured')}</span>
                                <ToggleSwitch
                                  checked={configForm?.featured ?? false}
                                  onChange={() =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, featured: !prev.featured }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>{t('admin.sortOrder')}</span>
                                <input
                                  className={styles.fieldInput}
                                  type="number"
                                  min={0}
                                  value={configForm?.sortOrder ?? 0}
                                  onChange={(e) =>
                                    setConfigForm((prev) =>
                                      prev
                                        ? { ...prev, sortOrder: Number(e.target.value) }
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right column: Rarity Rates */}
                          <div className={styles.detailSection}>
                            <h3 className={styles.detailSectionTitle}>
                              {t('admin.rarityRates')}
                            </h3>

                            <table className={styles.ratesTable}>
                              <thead>
                                <tr>
                                  <th>{t('admin.rarityLabel')}</th>
                                  <th>{t('admin.ratePercent')}</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {ratesForm.map((rate, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <input
                                        className={styles.ratesInput}
                                        type="text"
                                        value={rate.rarity}
                                        placeholder={t('admin.rarityPlaceholder')}
                                        onChange={(e) =>
                                          handleRateChange(idx, 'rarity', e.target.value)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className={styles.ratesInput}
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={rate.ratePct}
                                        onChange={(e) =>
                                          handleRateChange(
                                            idx,
                                            'ratePct',
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className={styles.ratesRemoveBtn}
                                        onClick={() => handleRemoveRate(idx)}
                                      >
                                        {t('admin.remove')}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <button
                              type="button"
                              className={styles.ratesAddBtn}
                              onClick={handleAddRate}
                            >
                              {t('admin.addRate')}
                            </button>

                            {ratesForm.length > 0 && Math.abs(ratesSum - 100) > 0.01 && (
                              <p className={styles.rateWarning}>
                                {t('admin.rateSum', { sum: ratesSum.toFixed(1) })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.saveBtn}
                            disabled={saving}
                            onClick={handleSave}
                          >
                            {saving ? t('admin.saving') : t('admin.save')}
                          </button>
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={handleCancel}
                          >
                            {t('admin.cancel')}
                          </button>
                          {saveResult && (
                            <span
                              className={
                                saveResult.ok ? styles.successMsg : styles.errorMsg
                              }
                            >
                              {saveResult.msg}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
